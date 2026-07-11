"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeRoute } from "@/lib/ops/routing/engine";

export type StopAction =
  | "lock"
  | "unlock"
  | "complete"
  | "uncomplete"
  | "skip"
  | "unskip"
  | "move_up"
  | "move_down";

export interface RouteStopActionResult {
  success: boolean;
  error?: string;
}

const AUDIT_BY_ACTION: Record<StopAction, string> = {
  lock: "route_stop_locked",
  unlock: "route_stop_unlocked",
  complete: "route_stop_completed",
  uncomplete: "route_stop_completed",
  skip: "route_stop_skipped",
  unskip: "route_stop_skipped",
  move_up: "route_reordered",
  move_down: "route_reordered",
};

/**
 * Field controls for a route stop: lock/unlock, complete, skip, and
 * manual reorder. Completed stops never move; after any change the
 * schedule is recomputed from the cached drive-time matrix.
 */
export async function routeStopAction(
  stopId: string,
  action: StopAction
): Promise<RouteStopActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: stop } = await supabase
    .from("route_stops")
    .select("id, daily_route_id, appointment_id, stop_order, locked_position, completed_at, skipped")
    .eq("id", stopId)
    .single();
  if (!stop) return { success: false, error: "Stop not found." };

  if ((action === "move_up" || action === "move_down") && stop.completed_at) {
    return { success: false, error: "Completed stops can't be moved." };
  }

  if (action === "move_up" || action === "move_down") {
    const targetOrder =
      action === "move_up" ? stop.stop_order - 1 : stop.stop_order + 1;
    const { data: neighbor } = await supabase
      .from("route_stops")
      .select("id, stop_order, completed_at")
      .eq("daily_route_id", stop.daily_route_id)
      .eq("stop_order", targetOrder)
      .single();
    if (!neighbor) {
      return { success: false, error: "The stop is already at that end of the route." };
    }
    if (neighbor.completed_at) {
      return { success: false, error: "Can't move a stop ahead of a completed stop." };
    }
    // Swap orders (via a temp value to avoid any unique collisions)
    await supabase.from("route_stops").update({ stop_order: -1 }).eq("id", stop.id);
    await supabase
      .from("route_stops")
      .update({ stop_order: stop.stop_order })
      .eq("id", neighbor.id);
    await supabase
      .from("route_stops")
      .update({ stop_order: targetOrder })
      .eq("id", stop.id);
  } else {
    const updates: Record<string, unknown> = {
      lock: { locked_position: true },
      unlock: { locked_position: false },
      complete: { completed_at: new Date().toISOString() },
      uncomplete: { completed_at: null },
      skip: { skipped: true },
      unskip: { skipped: false },
    }[action];

    const { error } = await supabase
      .from("route_stops")
      .update(updates)
      .eq("id", stopId);
    if (error) {
      console.error("[routeStopAction] update error:", error.message);
      return { success: false, error: "Failed to update the stop." };
    }

    // Keep the appointment lifecycle in sync with field completion
    if (action === "complete") {
      await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", stop.appointment_id)
        .in("status", ["routed", "booked", "in_progress", "scheduled", "confirmed"]);
    }
    if (action === "uncomplete") {
      await supabase
        .from("appointments")
        .update({ status: "routed" })
        .eq("id", stop.appointment_id)
        .eq("status", "completed");
    }
  }

  await supabase.from("audit_logs").insert({
    daily_route_id: stop.daily_route_id,
    appointment_id: stop.appointment_id,
    actor_id: user.id,
    event_type: AUDIT_BY_ACTION[action],
    metadata: { action, stop_id: stopId },
  });

  // Refresh ETAs (matrix is cached, so no API call for these changes)
  const recompute = await recomputeRoute(supabase, stop.daily_route_id);

  const { data: route } = await supabase
    .from("daily_routes")
    .select("route_date")
    .eq("id", stop.daily_route_id)
    .single();
  if (route) revalidatePath(`/admin/routes/${route.route_date}`);
  revalidatePath("/admin/routes");
  revalidatePath("/admin");

  if (!recompute.success) {
    return {
      success: false,
      error: `The change was saved, but the schedule could not be recalculated: ${recompute.error}`,
    };
  }
  return { success: true };
}
