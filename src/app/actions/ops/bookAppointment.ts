"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeRoute } from "@/lib/ops/routing/engine";

export interface BookAppointmentResult {
  success: boolean;
  error?: string;
}

const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Book a routed appointment: record the time set with the customer,
 * pin the stop so a route re-optimization holds it near that time, and
 * mark the appointment 'booked'. The booked time becomes the stop's
 * window start (the route won't schedule it before that time) and the
 * stop is locked in place.
 */
export async function bookAppointment(
  appointmentId: string,
  time: string,
  windowEnd?: string
): Promise<BookAppointmentResult> {
  if (!TIME_RE.test(time)) {
    return { success: false, error: "Enter a valid time." };
  }
  if (windowEnd && !TIME_RE.test(windowEnd)) {
    return { success: false, error: "Enter a valid latest-by time." };
  }
  if (windowEnd && windowEnd < time) {
    return { success: false, error: "The latest-by time must be after the booked time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // The appointment must be on a route to be booked
  const { data: stop } = await supabase
    .from("route_stops")
    .select("id, daily_route_id, daily_routes(route_date)")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (!stop) {
    return {
      success: false,
      error: "Add this appointment to a route before booking a time.",
    };
  }
  const routeDate = (
    stop.daily_routes as unknown as { route_date: string } | null
  )?.route_date;

  // Set the customer's time. window_start = booked time keeps the route
  // from visiting it earlier; the stop is locked so recalc won't move it.
  const { error: apptError } = await supabase
    .from("appointments")
    .update({
      status: "booked",
      confirmation_status: "confirmed_with_customer",
      appointment_time: time,
      time_window_start: time,
      time_window_end: windowEnd ?? null,
    })
    .eq("id", appointmentId);
  if (apptError) {
    console.error("[bookAppointment] appt update:", apptError.message);
    return { success: false, error: "Failed to book the appointment." };
  }

  await supabase
    .from("route_stops")
    .update({ locked_position: true })
    .eq("id", stop.id);

  await supabase.from("audit_logs").insert({
    appointment_id: appointmentId,
    daily_route_id: stop.daily_route_id,
    actor_id: user.id,
    event_type: "appointment_booked",
    metadata: { time, window_end: windowEnd ?? null },
  });

  // Recompute ETAs with the new window + lock (uses the cached matrix)
  const recompute = await recomputeRoute(supabase, stop.daily_route_id);

  if (routeDate) revalidatePath(`/admin/routes/${routeDate}`);
  revalidatePath(`/admin/appointments/${appointmentId}`);
  revalidatePath("/admin/appointments");

  if (!recompute.success) {
    return {
      success: false,
      error: `Booked, but the route ETAs could not refresh: ${recompute.error}`,
    };
  }
  return { success: true };
}
