/**
 * Address geocoding via the Google Geocoding API.
 * Server-only — uses GOOGLE_MAPS_API_KEY.
 */

import "server-only";

export type GeocodeOutcome =
  | {
      status: "success" | "ambiguous";
      lat: number;
      lng: number;
      formattedAddress: string;
      placeId: string;
      /** For 'ambiguous': why it needs confirmation */
      note?: string;
    }
  | { status: "failed"; error: string };

export function isGeocodingConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

export async function geocodeAddress(address: string): Promise<GeocodeOutcome> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      status: "failed",
      error: "Google Maps is not configured (GOOGLE_MAPS_API_KEY missing).",
    };
  }

  const params = new URLSearchParams({
    address,
    region: "us",
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );
  if (!response.ok) {
    return { status: "failed", error: "Geocoding request failed. Try again." };
  }

  const data = (await response.json()) as {
    status: string;
    results: {
      geometry: { location: { lat: number; lng: number }; location_type: string };
      formatted_address: string;
      place_id: string;
      partial_match?: boolean;
    }[];
    error_message?: string;
  };

  if (data.status === "ZERO_RESULTS" || data.results.length === 0) {
    return {
      status: "failed",
      error: "Address could not be located. Check the street, city, and state.",
    };
  }
  if (data.status !== "OK") {
    console.error("[geocodeAddress] API error:", data.status, data.error_message);
    return { status: "failed", error: "Geocoding service error. Try again later." };
  }

  const best = data.results[0];
  const ambiguous =
    data.results.length > 1 ||
    best.partial_match === true ||
    best.geometry.location_type === "APPROXIMATE";

  return {
    status: ambiguous ? "ambiguous" : "success",
    lat: best.geometry.location.lat,
    lng: best.geometry.location.lng,
    formattedAddress: best.formatted_address,
    placeId: best.place_id,
    note: ambiguous
      ? data.results.length > 1
        ? `Multiple possible matches — best match: ${best.formatted_address}`
        : `Approximate match: ${best.formatted_address}`
      : undefined,
  };
}
