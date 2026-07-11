"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type AppointmentStatus,
  VALID_APPOINTMENT_TRANSITIONS,
  STATUSES_SET_BY_ACTION,
} from "@/lib/types";

export interface UpdateAppointmentStatusResult {
  success: boolean;
  error?: string;
}

const AUDIT_EVENT_BY_STATUS: Partial<Record<AppointmentStatus, string>> = {
  cancelled: "appointment_cancelled",
  duplicate: "appointment_marked_duplicate",
};

const ACTION_HINT: Record<string, string> = {
  scheduled: "Use “Assign to Day” to schedule an appointment.",
  routed: "Appointments are placed on routes by the route builder.",
  booked: "Use “Book” on the route to set the customer's time.",
};

/**
 * Plain status flips (cancel, complete, reopen, etc.) with transition
 * validation and audit logging. Statuses that need extra data —
 * scheduled, routed, booked — are set by their dedicated actions, not
 * here.
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

  if (STATUSES_SET_BY_ACTION.includes(newStatus)) {
    return { success: false, error: ACTION_HINT[newStatus] ?? "Use the dedicated action." };
  }

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("status, customer_name, appointment_date")
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

  revalidatePath(`/admin/appointments/${appointmentId}`);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");

  return { success: true };
}
