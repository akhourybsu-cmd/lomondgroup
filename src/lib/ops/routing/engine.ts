/**
 * Route engine — server-side glue between the database and the pure
 * routing modules (matrix, optimize, schedule). Used by the route
 * server actions; keeps them thin and keeps recompute logic in one
 * place so every mutation path behaves identically.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeRouteMatrix, type RouteMatrix } from "./matrix";
import { optimizeStopOrder } from "./optimize";
import {
  computeSchedule,
  minutesToTime,
  timeToMinutes,
  type ScheduleStopInput,
} from "./schedule";

export interface RouteStopRow {
  id: string;
  appointment_id: string;
  stop_order: number;
  locked_position: boolean;
  completed_at: string | null;
  skipped: boolean;
  appointment: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    estimated_duration_minutes: number;
    time_window_start: string | null;
    time_window_end: string | null;
  };
}

export interface RouteRow {
  id: string;
  route_date: string;
  start_address: string;
  start_latitude: number | null;
  start_longitude: number | null;
  day_start_time: string;
  matrix_cache: RouteMatrix | null;
}

export async function fetchRouteWithStops(
  client: SupabaseClient,
  routeId: string
): Promise<{ route: RouteRow; stops: RouteStopRow[] } | null> {
  const [{ data: route }, { data: stops }] = await Promise.all([
    client.from("daily_routes").select("*").eq("id", routeId).single(),
    client
      .from("route_stops")
      .select(
        `id, appointment_id, stop_order, locked_position, completed_at, skipped,
         appointment:appointments(id, latitude, longitude, estimated_duration_minutes,
         time_window_start, time_window_end)`
      )
      .eq("daily_route_id", routeId)
      .order("stop_order"),
  ]);
  if (!route) return null;
  return {
    route: route as RouteRow,
    stops: (stops ?? []) as unknown as RouteStopRow[],
  };
}

/** Matrix cache is valid only if it covers exactly the same point set. */
function cacheIsValid(cache: RouteMatrix | null, keys: string[]): cache is RouteMatrix {
  if (!cache?.points) return false;
  const cached = cache.points.map((p) => p.key);
  return cached.length === keys.length && keys.every((k, i) => cached[i] === k);
}

/**
 * Recompute a route: optionally re-optimize stop order (respecting
 * locked and completed stops), refresh the drive-time matrix if the
 * stop set changed, recompute the schedule, and persist everything.
 */
export async function recomputeRoute(
  client: SupabaseClient,
  routeId: string,
  options: { reoptimize?: boolean } = {}
): Promise<{ success: boolean; error?: string; hasConflicts?: boolean }> {
  const fetched = await fetchRouteWithStops(client, routeId);
  if (!fetched) return { success: false, error: "Route not found." };
  const { route, stops } = fetched;

  if (route.start_latitude === null || route.start_longitude === null) {
    return { success: false, error: "Route start location has no coordinates." };
  }
  for (const stop of stops) {
    if (stop.appointment.latitude === null || stop.appointment.longitude === null) {
      return {
        success: false,
        error: "A stop is missing verified coordinates — re-verify its address.",
      };
    }
  }

  // Point 0 = start; points 1..N follow stop_order
  const pointKeys = ["start", ...stops.map((s) => s.appointment_id)];
  let matrix: RouteMatrix;
  if (cacheIsValid(route.matrix_cache, pointKeys)) {
    matrix = route.matrix_cache;
  } else {
    try {
      matrix = await computeRouteMatrix([
        { key: "start", lat: route.start_latitude, lng: route.start_longitude },
        ...stops.map((s) => ({
          key: s.appointment_id,
          lat: s.appointment.latitude!,
          lng: s.appointment.longitude!,
        })),
      ]);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Drive-time lookup failed.",
      };
    }
  }

  const matrixIndexByAppointment = new Map(
    matrix.points.map((p, i) => [p.key, i])
  );

  // Determine visiting order
  let orderedAppointmentIds: string[];
  if (options.reoptimize) {
    orderedAppointmentIds = optimizeStopOrder(
      stops.map((s, i) => ({
        id: s.appointment_id,
        matrixIndex: matrixIndexByAppointment.get(s.appointment_id)!,
        currentPosition: i,
        locked: s.locked_position,
        completed: s.completed_at !== null,
      })),
      matrix.seconds
    );
  } else {
    orderedAppointmentIds = stops.map((s) => s.appointment_id);
  }

  const stopByAppointment = new Map(stops.map((s) => [s.appointment_id, s]));
  const scheduleInput: ScheduleStopInput[] = orderedAppointmentIds.map((id) => {
    const s = stopByAppointment.get(id)!;
    return {
      id,
      matrixIndex: matrixIndexByAppointment.get(id)!,
      durationMinutes: s.appointment.estimated_duration_minutes,
      timeWindowStart: s.appointment.time_window_start,
      timeWindowEnd: s.appointment.time_window_end,
      completed: s.completed_at !== null,
      skipped: s.skipped,
    };
  });

  const schedule = computeSchedule(
    scheduleInput,
    matrix.seconds,
    matrix.meters,
    timeToMinutes(route.day_start_time)
  );

  // Persist stops
  const scheduledById = new Map(schedule.stops.map((s) => [s.id, s]));
  for (let i = 0; i < orderedAppointmentIds.length; i++) {
    const appointmentId = orderedAppointmentIds[i];
    const stopRow = stopByAppointment.get(appointmentId)!;
    const scheduled = scheduledById.get(appointmentId)!;
    const { error } = await client
      .from("route_stops")
      .update({
        stop_order: i + 1,
        estimated_arrival_time: stopRow.skipped
          ? null
          : minutesToTime(scheduled.arrivalMinutes),
        estimated_departure_time: stopRow.skipped
          ? null
          : minutesToTime(scheduled.departureMinutes),
        drive_time_from_previous_minutes: Math.round(
          scheduled.driveMinutesFromPrevious
        ),
        miles_from_previous: Math.round(scheduled.milesFromPrevious * 10) / 10,
      })
      .eq("id", stopRow.id);
    if (error) {
      console.error("[recomputeRoute] stop update error:", error.message);
      return { success: false, error: "Failed to save the recalculated route." };
    }
  }

  // Return-leg mileage: last non-skipped stop → start (index 0), for
  // accurate round-trip tax mileage. 0 if there are no active stops.
  const lastActiveId = [...scheduleInput].reverse().find((s) => !s.skipped)?.id;
  const returnMeters =
    lastActiveId !== undefined
      ? matrix.meters[matrixIndexByAppointment.get(lastActiveId)!][0]
      : 0;
  const returnMiles = Math.round((returnMeters / 1609.344) * 10) / 10;

  // Persist route totals + matrix cache
  const { error: routeError } = await client
    .from("daily_routes")
    .update({
      total_miles: Math.round(schedule.totalMiles * 10) / 10,
      total_drive_time_minutes: Math.round(schedule.totalDriveMinutes),
      total_appointment_time_minutes: schedule.totalAppointmentMinutes,
      estimated_day_end_time: minutesToTime(schedule.dayEndMinutes),
      return_to_start_miles: returnMiles,
      optimization_method: options.reoptimize
        ? "nearest_neighbor_2opt"
        : "manual",
      matrix_cache: matrix,
    })
    .eq("id", routeId);
  if (routeError) {
    console.error("[recomputeRoute] route update error:", routeError.message);
    return { success: false, error: "Failed to save the route totals." };
  }

  return { success: true, hasConflicts: schedule.hasConflicts };
}
