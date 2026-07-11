"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress, isGeocodingConfigured } from "@/lib/ops/geocoding/google";
import { fullAddress } from "@/lib/ops/format";

export interface AssignToDayResult {
  success: boolean;
  geocode?: "success" | "ambiguous" | "failed" | "skipped";
  message?: string;
  error?: string;
}

/**
 * Assign an appointment to a day (the route-first "schedule" step):
 * sets appointment_date, verifies the address (geocode), and moves the
 * status to 'scheduled' so it enters that day's route pool. No time is
 * required — booking happens after the route is built.
 *
 * If the appointment is already on a route and the day changes, it's
 * removed from the old route's stops (the old route should be
 * recalculated).
 */
export async function assignToDay(
  appointmentId: string,
  date: string
): Promise<AssignToDayResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "Pick a valid date." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, status, appointment_date, address_line_1, address_line_2, city, state, zip, geocoding_status, geocoded_source_address"
    )
    .eq("id", appointmentId)
    .single();
  if (!appt) return { success: false, error: "Appointment not found." };

  if (!appt.address_line_1 || !appt.city || !appt.state) {
    return {
      success: false,
      error: "Add a street address, city, and state before assigning to a day.",
    };
  }

  const dayChanged = appt.appointment_date !== date;

  // If it was on a route for a different day, pull it off that route.
  if (dayChanged) {
    const { data: existingStop } = await supabase
      .from("route_stops")
      .select("id, daily_route_id, daily_routes(route_date)")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    if (existingStop) {
      const oldDate = (
        existingStop.daily_routes as unknown as { route_date: string } | null
      )?.route_date;
      if (oldDate && oldDate !== date) {
        await supabase.from("route_stops").delete().eq("id", existingStop.id);
        revalidatePath(`/admin/routes/${oldDate}`);
      }
    }
  }

  // Geocode (verify) the address if not already verified for this address
  const address = fullAddress(appt);
  const needsGeocode =
    appt.geocoding_status !== "success" ||
    appt.geocoded_source_address !== address;

  const updates: Record<string, unknown> = {
    appointment_date: date,
    status: "scheduled",
  };
  let geocodeOutcome: AssignToDayResult["geocode"] = "skipped";

  if (needsGeocode && address && isGeocodingConfigured()) {
    const outcome = await geocodeAddress(address);
    if (outcome.status === "failed") {
      Object.assign(updates, {
        geocoding_status: "failed",
        geocoded_source_address: address,
        geocoded_at: new Date().toISOString(),
      });
      geocodeOutcome = "failed";
    } else {
      Object.assign(updates, {
        geocoding_status: outcome.status,
        latitude: outcome.lat,
        longitude: outcome.lng,
        google_place_id: outcome.placeId,
        formatted_address: outcome.formattedAddress,
        geocoded_source_address: address,
        geocoded_at: new Date().toISOString(),
      });
      geocodeOutcome = outcome.status;
    }
  } else if (appt.geocoding_status === "success") {
    geocodeOutcome = "success";
  }

  const { error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId);
  if (error) {
    console.error("[assignToDay] update:", error.message);
    return { success: false, error: "Failed to assign the appointment." };
  }

  await supabase.from("audit_logs").insert({
    appointment_id: appointmentId,
    actor_id: user.id,
    event_type: "appointment_scheduled",
    metadata: { date, geocode: geocodeOutcome },
  });

  revalidatePath(`/admin/appointments/${appointmentId}`);
  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/calendar/${date}`);
  revalidatePath(`/admin/routes/${date}`);
  revalidatePath("/admin");

  const message =
    geocodeOutcome === "failed"
      ? "Assigned to the day, but the address could not be verified — fix it before routing."
      : geocodeOutcome === "ambiguous"
        ? "Assigned to the day. The address is approximate — confirm it before routing."
        : "Assigned to the day and address verified — ready to route.";

  return { success: true, geocode: geocodeOutcome, message };
}

/** Remove an appointment from its day (back to Needs Review). */
export async function unscheduleAppointment(
  appointmentId: string
): Promise<AssignToDayResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: stop } = await supabase
    .from("route_stops")
    .select("id, daily_routes(route_date)")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (stop) {
    await supabase.from("route_stops").delete().eq("id", stop.id);
    const d = (stop.daily_routes as unknown as { route_date: string } | null)
      ?.route_date;
    if (d) revalidatePath(`/admin/routes/${d}`);
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "needs_review" })
    .eq("id", appointmentId);
  if (error) {
    return { success: false, error: "Failed to unschedule the appointment." };
  }

  revalidatePath(`/admin/appointments/${appointmentId}`);
  revalidatePath("/admin/appointments");
  return { success: true };
}
