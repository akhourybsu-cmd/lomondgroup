"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recomputeRoute } from "@/lib/ops/routing/engine";

export interface ReoptimizeRouteResult {
  success: boolean;
  hasConflicts?: boolean;
  error?: string;
}

/**
 * Full route re-optimization, explicitly user-initiated. Completed
 * stops and locked stops never move; only free stops are reordered.
 */
export async function reoptimizeRoute(
  routeId: string
): Promise<ReoptimizeRouteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const result = await recomputeRoute(supabase, routeId, { reoptimize: true });
  if (!result.success) return { success: false, error: result.error };

  await supabase.from("audit_logs").insert({
    daily_route_id: routeId,
    actor_id: user.id,
    event_type: "route_reordered",
    metadata: { method: "full_reoptimize" },
  });

  const { data: route } = await supabase
    .from("daily_routes")
    .select("route_date")
    .eq("id", routeId)
    .single();
  if (route) revalidatePath(`/admin/routes/${route.route_date}`);
  revalidatePath("/admin/routes");

  return { success: true, hasConflicts: result.hasConflicts };
}
