import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-proxied static map image for a route: numbered stop pins plus
 * a route line, rendered by the Google Maps Static API. Proxying keeps
 * GOOGLE_MAPS_API_KEY server-only — the browser only ever sees this
 * authenticated endpoint, never the key.
 */

interface StopPoint {
  order: number;
  lat: number;
  lng: number;
  completed: boolean;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Maps not configured." }, { status: 503 });
  }

  // Auth + RLS: only signed-in staff can see route data
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [{ data: route }, { data: stops }] = await Promise.all([
    supabase
      .from("daily_routes")
      .select("id, start_latitude, start_longitude")
      .eq("id", id)
      .single(),
    supabase
      .from("route_stops")
      .select(
        "stop_order, skipped, completed_at, appointment:appointments(latitude, longitude)"
      )
      .eq("daily_route_id", id)
      .order("stop_order"),
  ]);

  if (!route) {
    return NextResponse.json({ error: "Route not found." }, { status: 404 });
  }

  const points: StopPoint[] = (stops ?? [])
    .filter((s) => !s.skipped)
    .map((s) => {
      const appt = s.appointment as unknown as {
        latitude: number | null;
        longitude: number | null;
      } | null;
      return {
        order: s.stop_order,
        lat: appt?.latitude,
        lng: appt?.longitude,
        completed: s.completed_at !== null,
      };
    })
    .filter((p): p is StopPoint => p.lat != null && p.lng != null);

  if (points.length === 0 || route.start_latitude === null) {
    return NextResponse.json(
      { error: "Route has no mappable stops." },
      { status: 422 }
    );
  }

  const coord = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const start = coord(route.start_latitude, route.start_longitude!);

  const query = new URLSearchParams({
    size: "640x400",
    scale: "2",
    maptype: "roadmap",
    key: apiKey,
  });
  // Start pin (green "S"), then one numbered pin per stop (single-char
  // labels only — stops past 9 get an unlabeled pin; completed = gray)
  query.append("markers", `color:green|label:S|${start}`);
  for (const p of points) {
    const label = p.order <= 9 ? `label:${p.order}|` : "";
    const color = p.completed ? "color:gray|" : "color:0x1B3A5C|";
    query.append("markers", `${color}${label}${coord(p.lat, p.lng)}`);
  }
  // Route line in brand navy, start → stops in visiting order
  query.append(
    "path",
    `color:0x1B3A5CCC|weight:4|${start}|${points
      .map((p) => coord(p.lat, p.lng))
      .join("|")}`
  );

  const upstream = await fetch(
    `https://maps.googleapis.com/maps/api/staticmap?${query.toString()}`
  );
  if (!upstream.ok) {
    const detail = await upstream.text();
    console.error("[route-map] Static Maps error:", upstream.status, detail);
    return NextResponse.json({ error: "Map render failed." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      // Private + short-lived: the map changes as stops are reordered
      "Cache-Control": "private, max-age=60",
    },
  });
}
