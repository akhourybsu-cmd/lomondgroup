"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/ops/geocoding/google";
import { recomputeRoute } from "@/lib/ops/routing/engine";
import { ROUTABLE_STATUSES } from "@/lib/types";
import { z } from "zod";

const GenerateRouteSchema = z.object({
  route_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Pick a valid route date.",
  }),
  start_address: z.string().min(5, { message: "Enter a start address." }),
  day_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Enter a valid day start time." }),
});

export interface GenerateRouteResult {
  success: boolean;
  routeDate?: string;
  warnings?: string[];
  error?: string;
}

/**
 * Build the optimized route for a date from its confirmed,
 * address-verified appointments. Fails clearly (no partial routes)
 * when appointments aren't ready — the user always knows why an
 * appointment can't be routed.
 */
export async function generateRoute(
  _prev: GenerateRouteResult | null,
  formData: FormData
): Promise<GenerateRouteResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const parsed = GenerateRouteSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid route settings.",
    };
  }
  const { route_date, start_address, day_start_time } = parsed.data;

  // One working route per date (enforced by a partial unique index too)
  const { data: existingRoute } = await supabase
    .from("daily_routes")
    .select("id")
    .eq("route_date", route_date)
    .in("route_status", ["draft", "active"])
    .limit(1);
  if (existingRoute && existingRoute.length > 0) {
    return {
      success: false,
      error:
        "A route already exists for this date. Open it to recalculate or insert new appointments.",
    };
  }

  // Gather the date's appointments and split routable vs not
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, customer_name, status, geocoding_status, latitude, longitude, estimated_duration_minutes"
    )
    .eq("appointment_date", route_date)
    .in("status", ROUTABLE_STATUSES);

  const routable = (appointments ?? []).filter(
    (a) => a.geocoding_status === "success" && a.latitude !== null && a.longitude !== null
  );
  const notReady = (appointments ?? []).filter((a) => !routable.includes(a));

  if (routable.length === 0) {
    return {
      success: false,
      error:
        (appointments ?? []).length === 0
          ? "No appointments assigned to this day yet. Assign appointments to the day first."
          : "No appointments on this day have a verified address yet. Fix their addresses first.",
    };
  }

  const warnings = notReady.map(
    (a) =>
      `${a.customer_name ?? "Unnamed appointment"} was left off the route — address not verified.`
  );

  // Geocode the start location
  const startOutcome = await geocodeAddress(start_address);
  if (startOutcome.status === "failed") {
    return {
      success: false,
      error: `Start location problem: ${startOutcome.error}`,
    };
  }

  // Create the route + stops (initial order = creation order; the
  // optimizer fixes it in recomputeRoute below)
  const { data: route, error: routeError } = await supabase
    .from("daily_routes")
    .insert({
      route_date,
      start_address: startOutcome.formattedAddress,
      start_latitude: startOutcome.lat,
      start_longitude: startOutcome.lng,
      day_start_time,
      route_status: "draft",
    })
    .select("id")
    .single();
  if (routeError || !route) {
    console.error("[generateRoute] route insert:", routeError?.message);
    return { success: false, error: "Failed to create the route." };
  }

  const { error: stopsError } = await supabase.from("route_stops").insert(
    routable.map((a, i) => ({
      daily_route_id: route.id,
      appointment_id: a.id,
      stop_order: i + 1,
    }))
  );
  if (stopsError) {
    console.error("[generateRoute] stops insert:", stopsError.message);
    await supabase.from("daily_routes").delete().eq("id", route.id);
    return { success: false, error: "Failed to add stops to the route." };
  }

  // Optimize + schedule + persist
  const computed = await recomputeRoute(supabase, route.id, { reoptimize: true });
  if (!computed.success) {
    await supabase.from("route_stops").delete().eq("daily_route_id", route.id);
    await supabase.from("daily_routes").delete().eq("id", route.id);
    return { success: false, error: computed.error };
  }

  // Mark scheduled appointments as routed (leave booked/in_progress as-is)
  await supabase
    .from("appointments")
    .update({ status: "routed" })
    .in(
      "id",
      routable
        .filter((a) => a.status === "scheduled" || a.status === "confirmed")
        .map((a) => a.id)
    );

  await supabase.from("audit_logs").insert({
    daily_route_id: route.id,
    actor_id: user.id,
    event_type: "route_generated",
    metadata: { route_date, stops: routable.length },
  });

  if (computed.hasConflicts) {
    warnings.push(
      "Route Conflict: at least one stop can't be reached within its time window. Review the route."
    );
  }

  revalidatePath("/admin/routes");
  revalidatePath(`/admin/routes/${route_date}`);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");

  return { success: true, routeDate: route_date, warnings };
}
