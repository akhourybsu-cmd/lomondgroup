/**
 * Google Maps directions URL for a whole route — the "open the day in
 * Google Maps" button. Pure string building, no API calls, safe to use
 * anywhere.
 *
 * The Maps URL scheme caps waypoints at 9 (plus origin + destination),
 * so a day with more than 10 remaining stops gets the first 10 and a
 * truncation count the UI can surface.
 */

export interface RoutePoint {
  lat: number;
  lng: number;
}

const MAX_WAYPOINTS = 9;

export function buildGoogleMapsRouteUrl(
  originAddress: string,
  orderedPoints: RoutePoint[]
): { url: string; truncatedCount: number } | null {
  if (orderedPoints.length === 0) return null;

  const coord = (p: RoutePoint) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

  const destination = orderedPoints[orderedPoints.length - 1];
  const waypoints = orderedPoints.slice(0, -1);
  const truncatedCount = Math.max(0, waypoints.length - MAX_WAYPOINTS);
  const included = waypoints.slice(0, MAX_WAYPOINTS);

  const params = new URLSearchParams({
    api: "1",
    origin: originAddress,
    destination: coord(destination),
    travelmode: "driving",
  });
  if (included.length > 0) {
    params.set("waypoints", included.map(coord).join("|"));
  }

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    truncatedCount,
  };
}
