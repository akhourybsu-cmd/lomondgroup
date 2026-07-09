/**
 * Drive-time/distance matrix via the Google Routes API
 * (computeRouteMatrix). Server-only — uses GOOGLE_MAPS_API_KEY.
 */

import "server-only";

export interface MatrixPoint {
  /** 'start' or an appointment id */
  key: string;
  lat: number;
  lng: number;
}

export interface RouteMatrix {
  points: MatrixPoint[];
  /** seconds[i][j] = drive seconds from points[i] to points[j] */
  seconds: number[][];
  meters: number[][];
}

export async function computeRouteMatrix(points: MatrixPoint[]): Promise<RouteMatrix> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps is not configured (GOOGLE_MAPS_API_KEY missing).");
  }
  if (points.length < 2) {
    return { points, seconds: [[0]], meters: [[0]] };
  }
  if (points.length > 25) {
    throw new Error("Too many stops for a single route (maximum 24).");
  }

  const waypoints = points.map((p) => ({
    waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
  }));

  const response = await fetch(
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "originIndex,destinationIndex,duration,distanceMeters,condition",
      },
      body: JSON.stringify({
        origins: waypoints,
        destinations: waypoints,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("[computeRouteMatrix] Routes API error:", response.status, body);
    throw new Error("Could not calculate drive times (Routes API error).");
  }

  const elements = (await response.json()) as {
    originIndex: number;
    destinationIndex: number;
    duration?: string; // "123s"
    distanceMeters?: number;
    condition?: string;
  }[];

  const n = points.length;
  const seconds: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const meters: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (const el of elements) {
    if (el.condition && el.condition !== "ROUTE_EXISTS") {
      const from = points[el.originIndex]?.key;
      const to = points[el.destinationIndex]?.key;
      throw new Error(
        `No drivable route found between two stops (${from} → ${to}). Check the addresses.`
      );
    }
    seconds[el.originIndex][el.destinationIndex] = el.duration
      ? parseInt(el.duration, 10)
      : 0;
    meters[el.originIndex][el.destinationIndex] = el.distanceMeters ?? 0;
  }

  return { points, seconds, meters };
}
