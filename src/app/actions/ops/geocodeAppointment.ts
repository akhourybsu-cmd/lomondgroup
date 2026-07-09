"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/ops/geocoding/google";
import { fullAddress } from "@/lib/ops/format";

export interface GeocodeAppointmentResult {
  success: boolean;
  status?: "success" | "ambiguous" | "failed";
  formattedAddress?: string;
  error?: string;
}

/**
 * Verify an appointment's address: geocode it, store the coordinates
 * and canonical formatted address, and record the outcome (including
 * ambiguous matches) so routing can gate on it.
 */
export async function geocodeAppointment(
  appointmentId: string
): Promise<GeocodeAppointmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, address_line_1, address_line_2, city, state, zip")
    .eq("id", appointmentId)
    .single();
  if (!appt) return { success: false, error: "Appointment not found." };

  const address = fullAddress(appt);
  if (!address || !appt.address_line_1 || !appt.city || !appt.state) {
    return {
      success: false,
      error: "Add a street address, city, and state before verifying.",
    };
  }

  const outcome = await geocodeAddress(address);

  if (outcome.status === "failed") {
    await supabase
      .from("appointments")
      .update({
        geocoding_status: "failed",
        geocoded_source_address: address,
        geocoded_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);
    revalidatePath(`/admin/appointments/${appointmentId}`);
    return { success: false, status: "failed", error: outcome.error };
  }

  await supabase
    .from("appointments")
    .update({
      geocoding_status: outcome.status,
      latitude: outcome.lat,
      longitude: outcome.lng,
      google_place_id: outcome.placeId,
      formatted_address: outcome.formattedAddress,
      geocoded_source_address: address,
      geocoded_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  await supabase.from("audit_logs").insert({
    appointment_id: appointmentId,
    actor_id: user.id,
    event_type: "appointment_updated",
    metadata: { geocode: outcome.status, formatted_address: outcome.formattedAddress },
  });

  revalidatePath(`/admin/appointments/${appointmentId}`);
  return {
    success: true,
    status: outcome.status,
    formattedAddress: outcome.formattedAddress,
    error: outcome.status === "ambiguous" ? outcome.note : undefined,
  };
}
