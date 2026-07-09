"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type AppointmentStatus,
  VALID_APPOINTMENT_TRANSITIONS,
} from "@/lib/types";
import { geocodeAddress, isGeocodingConfigured } from "@/lib/ops/geocoding/google";
import { fullAddress } from "@/lib/ops/format";

export interface UpdateAppointmentStatusResult {
  success: boolean;
  error?: string;
}

const AUDIT_EVENT_BY_STATUS: Partial<Record<AppointmentStatus, string>> = {
  confirmed: "appointment_confirmed",
  cancelled: "appointment_cancelled",
  duplicate: "appointment_marked_duplicate",
};

/**
 * Update an appointment's status with transition validation and audit
 * logging. Mirrors updateJobStatus. 'routed' is never set here — only
 * the route builder assigns it.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus
): Promise<UpdateAppointmentStatusResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  if (newStatus === "routed") {
    return {
      success: false,
      error: "Appointments are marked as routed by the route builder.",
    };
  }

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select(
      "status, customer_name, appointment_date, geocoding_status, address_line_1, address_line_2, city, state, zip"
    )
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appt) {
    return { success: false, error: "Appointment not found." };
  }

  const currentStatus = appt.status as AppointmentStatus;
  const allowed = VALID_APPOINTMENT_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot change status from "${currentStatus}" to "${newStatus}".`,
    };
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId);

  if (updateError) {
    console.error("[updateAppointmentStatus] error:", updateError.message);
    return { success: false, error: "Failed to update appointment status." };
  }

  await supabase.from("audit_logs").insert({
    appointment_id: appointmentId,
    actor_id: user.id,
    event_type: AUDIT_EVENT_BY_STATUS[newStatus] ?? "appointment_updated",
    metadata: { from: currentStatus, to: newStatus },
  });

  // On confirm, auto-verify the address (best-effort — a failure just
  // leaves the geocoding warning visible on the detail page)
  if (
    newStatus === "confirmed" &&
    appt.geocoding_status === "not_started" &&
    appt.address_line_1 &&
    appt.city &&
    appt.state &&
    isGeocodingConfigured()
  ) {
    try {
      const address = fullAddress(appt)!;
      const outcome = await geocodeAddress(address);
      await supabase
        .from("appointments")
        .update(
          outcome.status === "failed"
            ? {
                geocoding_status: "failed",
                geocoded_source_address: address,
                geocoded_at: new Date().toISOString(),
              }
            : {
                geocoding_status: outcome.status,
                latitude: outcome.lat,
                longitude: outcome.lng,
                google_place_id: outcome.placeId,
                formatted_address: outcome.formattedAddress,
                geocoded_source_address: address,
                geocoded_at: new Date().toISOString(),
              }
        )
        .eq("id", appointmentId);
    } catch (error) {
      console.error("[updateAppointmentStatus] auto-geocode failed:", error);
    }
  }

  revalidatePath(`/admin/appointments/${appointmentId}`);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");

  return { success: true };
}
