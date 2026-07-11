"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeRouteMatrix } from "@/lib/ops/routing/matrix";
import { evaluateInsertion } from "@/lib/ops/routing/insertion";
import { fetchRouteWithStops, recomputeRoute } from "@/lib/ops/routing/engine";
import { timeToMinutes, type ScheduleStopInput } from "@/lib/ops/routing/schedule";

export interface SuggestInsertionResult {
  success: boolean;
  suggestionId?: string;
  insertAfterLabel?: string; // e.g. "Stop 3" or "the start"
  insertBeforeLabel?: string;
  addedDriveMinutes?: number;
  addedMiles?: number;
  createsConflict?: boolean;
  conflictReason?: string | null;
  error?: string;
}

/**
 * Mode 1 — best-insertion suggestion. Evaluates where a new confirmed
 * appointment fits into the day's existing route with the least added
 * drive time, WITHOUT changing the existing stop order. The suggestion
 * is stored and shown to the user; nothing is applied until they say so.
 */
export async function suggestInsertion(
  routeId: string,
  appointmentId: string
): Promise<SuggestInsertionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const fetched = await fetchRouteWithStops(supabase, routeId);
  if (!fetched) return { success: false, error: "Route not found." };
  const { route, stops } = fetched;

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, geocoding_status, latitude, longitude, estimated_duration_minutes, time_window_start, time_window_end"
    )
    .eq("id", appointmentId)
    .single();
  if (!appt) return { success: false, error: "Appointment not found." };
  if (appt.status !== "scheduled") {
    return { success: false, error: "Assign the appointment to this day before adding it to the route." };
  }
  if (appt.geocoding_status !== "success" || appt.latitude === null) {
    return { success: false, error: "Verify the appointment's address first." };
  }
  if (stops.some((s) => s.appointment_id === appointmentId)) {
    return { success: false, error: "This appointment is already on the route." };
  }

  // Fresh matrix including the new point
  let matrix;
  try {
    matrix = await computeRouteMatrix([
      { key: "start", lat: route.start_latitude!, lng: route.start_longitude! },
      ...stops.map((s) => ({
        key: s.appointment_id,
        lat: s.appointment.latitude!,
        lng: s.appointment.longitude!,
      })),
      { key: appointmentId, lat: appt.latitude, lng: appt.longitude! },
    ]);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Drive-time lookup failed.",
    };
  }

  const indexByKey = new Map(matrix.points.map((p, i) => [p.key, i]));
  const scheduleStops: ScheduleStopInput[] = stops.map((s) => ({
    id: s.appointment_id,
    matrixIndex: indexByKey.get(s.appointment_id)!,
    durationMinutes: s.appointment.estimated_duration_minutes,
    timeWindowStart: s.appointment.time_window_start,
    timeWindowEnd: s.appointment.time_window_end,
    completed: s.completed_at !== null,
    skipped: s.skipped,
  }));

  const candidates = evaluateInsertion(
    scheduleStops,
    {
      id: appointmentId,
      matrixIndex: indexByKey.get(appointmentId)!,
      durationMinutes: appt.estimated_duration_minutes,
      timeWindowStart: appt.time_window_start,
      timeWindowEnd: appt.time_window_end,
      completed: false,
      skipped: false,
    },
    matrix.seconds,
    matrix.meters,
    timeToMinutes(route.day_start_time)
  );
  const best = candidates[0];
  if (!best) return { success: false, error: "No insertion position available." };

  const afterStop = best.insertAtPosition > 0 ? stops[best.insertAtPosition - 1] : null;
  const beforeStop =
    best.insertAtPosition < stops.length ? stops[best.insertAtPosition] : null;

  const { data: suggestion, error: insertError } = await supabase
    .from("route_adjustment_suggestions")
    .insert({
      daily_route_id: routeId,
      appointment_id: appointmentId,
      suggested_insert_after_stop_id: afterStop?.id ?? null,
      suggested_insert_before_stop_id: beforeStop?.id ?? null,
      added_drive_time_minutes: Math.round(best.addedDriveMinutes),
      added_miles: Math.round(best.addedMiles * 10) / 10,
      creates_conflict: best.createsConflict,
      conflict_reason: best.conflictReason,
    })
    .select("id")
    .single();
  if (insertError || !suggestion) {
    console.error("[suggestInsertion] insert error:", insertError?.message);
    return { success: false, error: "Could not save the suggestion." };
  }

  return {
    success: true,
    suggestionId: suggestion.id,
    insertAfterLabel: afterStop ? `Stop ${afterStop.stop_order}` : "the start",
    insertBeforeLabel: beforeStop ? `Stop ${beforeStop.stop_order}` : "the end of the day",
    addedDriveMinutes: Math.round(best.addedDriveMinutes),
    addedMiles: Math.round(best.addedMiles * 10) / 10,
    createsConflict: best.createsConflict,
    conflictReason: best.conflictReason,
  };
}

export interface ApplyInsertionResult {
  success: boolean;
  error?: string;
}

/** Apply a stored insertion suggestion: add the stop, recompute ETAs. */
export async function applyInsertion(
  suggestionId: string
): Promise<ApplyInsertionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: suggestion } = await supabase
    .from("route_adjustment_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single();
  if (!suggestion) return { success: false, error: "Suggestion not found." };
  if (suggestion.accepted !== null) {
    return { success: false, error: "This suggestion was already handled." };
  }

  const { data: stops } = await supabase
    .from("route_stops")
    .select("id, stop_order")
    .eq("daily_route_id", suggestion.daily_route_id)
    .order("stop_order");

  // Position after the anchor stop (or first if inserting at the start)
  const afterStop = (stops ?? []).find(
    (s) => s.id === suggestion.suggested_insert_after_stop_id
  );
  const newOrder = afterStop ? afterStop.stop_order + 1 : 1;

  // Shift later stops down (descending, to avoid transient collisions)
  const toShift = (stops ?? [])
    .filter((s) => s.stop_order >= newOrder)
    .sort((a, b) => b.stop_order - a.stop_order);
  for (const s of toShift) {
    await supabase
      .from("route_stops")
      .update({ stop_order: s.stop_order + 1 })
      .eq("id", s.id);
  }

  const { error: stopError } = await supabase.from("route_stops").insert({
    daily_route_id: suggestion.daily_route_id,
    appointment_id: suggestion.appointment_id,
    stop_order: newOrder,
  });
  if (stopError) {
    console.error("[applyInsertion] stop insert:", stopError.message);
    return { success: false, error: "Failed to add the stop to the route." };
  }

  await supabase
    .from("appointments")
    .update({ status: "routed" })
    .eq("id", suggestion.appointment_id)
    .eq("status", "scheduled");

  await supabase
    .from("route_adjustment_suggestions")
    .update({ accepted: true })
    .eq("id", suggestionId);

  await supabase.from("audit_logs").insert({
    daily_route_id: suggestion.daily_route_id,
    appointment_id: suggestion.appointment_id,
    actor_id: user.id,
    event_type: "appointment_inserted_into_route",
    metadata: { suggestion_id: suggestionId, position: newOrder },
  });

  // Stop set changed → matrix cache is stale; recompute refreshes it
  const recompute = await recomputeRoute(supabase, suggestion.daily_route_id);

  const { data: route } = await supabase
    .from("daily_routes")
    .select("route_date")
    .eq("id", suggestion.daily_route_id)
    .single();
  if (route) revalidatePath(`/admin/routes/${route.route_date}`);
  revalidatePath("/admin/routes");
  revalidatePath("/admin/appointments");

  if (!recompute.success) {
    return {
      success: false,
      error: `The stop was added, but ETAs could not be recalculated: ${recompute.error}`,
    };
  }
  return { success: true };
}
