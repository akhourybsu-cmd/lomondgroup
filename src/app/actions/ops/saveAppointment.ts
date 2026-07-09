"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/; // input type="time" → "HH:MM"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SaveAppointmentSchema = z
  .object({
    id: z.string().uuid().optional(),
    contractor_id: z.string().uuid().optional(),

    customer_name: z.string().max(200).optional(),
    customer_phone: z.string().max(40).optional(),
    customer_email: z
      .string()
      .email({ message: "Must be a valid email address." })
      .optional()
      .or(z.literal("")),

    address_line_1: z.string().max(300).optional(),
    address_line_2: z.string().max(300).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(60).optional(),
    zip: z.string().max(20).optional(),

    appointment_date: z
      .string()
      .regex(DATE_RE, { message: "Appointment date must be a valid date." })
      .optional(),
    appointment_time: z
      .string()
      .regex(TIME_RE, { message: "Appointment time must be a valid time." })
      .optional(),
    time_window_start: z
      .string()
      .regex(TIME_RE, { message: "Time window start must be a valid time." })
      .optional(),
    time_window_end: z
      .string()
      .regex(TIME_RE, { message: "Time window end must be a valid time." })
      .optional(),
    estimated_duration_minutes: z.coerce
      .number()
      .int()
      .positive({ message: "Estimated duration must be greater than 0 minutes." }),

    claim_number: z.string().max(100).optional(),
    reference_number: z.string().max(100).optional(),
    insurance_company: z.string().max(200).optional(),

    vehicle_year: z.coerce
      .number()
      .int()
      .min(1900, { message: "Vehicle year must be 1900 or later." })
      .max(new Date().getFullYear() + 2, {
        message: "Vehicle year is too far in the future.",
      })
      .optional(),
    vehicle_make: z.string().max(100).optional(),
    vehicle_model: z.string().max(100).optional(),
    vin: z.string().max(20).optional(),
    vehicle_location_notes: z.string().max(2000).optional(),

    damage_notes: z.string().max(4000).optional(),
    special_instructions: z.string().max(4000).optional(),
    internal_notes: z.string().max(4000).optional(),

    confirmation_status: z
      .enum([
        "unconfirmed",
        "confirmed_with_customer",
        "confirmed_by_contractor",
        "unable_to_confirm",
        "not_required",
      ])
      .optional(),
  })
  .refine(
    (d) =>
      !d.time_window_start ||
      !d.time_window_end ||
      d.time_window_start <= d.time_window_end,
    { message: "Time window start must be before its end." }
  );

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveAppointmentResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Address fields that invalidate a stored geocode when they change. */
const ADDRESS_FIELDS = ["address_line_1", "address_line_2", "city", "state", "zip"] as const;

function addressFingerprint(row: Record<string, unknown>): string {
  return ADDRESS_FIELDS.map((f) => String(row[f] ?? "").trim().toLowerCase()).join("|");
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Create or update an appointment (manual entry / review edits).
 * - New appointments start as 'needs_review' with source_type 'manual';
 *   confirmation happens explicitly on the detail page.
 * - Changing any address field resets the stored geocode so stale
 *   coordinates can never leak into a route.
 */
export async function saveAppointment(
  _prev: SaveAppointmentResult | null,
  formData: FormData
): Promise<SaveAppointmentResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  const raw = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v])
  );

  const parsed = SaveAppointmentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const { id, ...f } = parsed.data;

  const row = {
    contractor_id: f.contractor_id ?? null,
    customer_name: f.customer_name?.trim() || null,
    customer_phone: f.customer_phone?.trim() || null,
    customer_email: f.customer_email || null,
    address_line_1: f.address_line_1?.trim() || null,
    address_line_2: f.address_line_2?.trim() || null,
    city: f.city?.trim() || null,
    state: f.state?.trim() || null,
    zip: f.zip?.trim() || null,
    appointment_date: f.appointment_date ?? null,
    appointment_time: f.appointment_time ?? null,
    time_window_start: f.time_window_start ?? null,
    time_window_end: f.time_window_end ?? null,
    estimated_duration_minutes: f.estimated_duration_minutes,
    claim_number: f.claim_number?.trim() || null,
    reference_number: f.reference_number?.trim() || null,
    insurance_company: f.insurance_company?.trim() || null,
    vehicle_year: f.vehicle_year ?? null,
    vehicle_make: f.vehicle_make?.trim() || null,
    vehicle_model: f.vehicle_model?.trim() || null,
    vin: f.vin?.trim() || null,
    vehicle_location_notes: f.vehicle_location_notes?.trim() || null,
    damage_notes: f.damage_notes?.trim() || null,
    special_instructions: f.special_instructions?.trim() || null,
    internal_notes: f.internal_notes?.trim() || null,
    ...(f.confirmation_status && { confirmation_status: f.confirmation_status }),
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  if (id) {
    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("id, address_line_1, address_line_2, city, state, zip, status")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Appointment not found." };
    }

    const addressChanged =
      addressFingerprint(existing) !== addressFingerprint(row);

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        ...row,
        ...(addressChanged && {
          geocoding_status: "not_started",
          latitude: null,
          longitude: null,
          google_place_id: null,
          formatted_address: null,
          geocoded_source_address: null,
          geocoded_at: null,
        }),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[saveAppointment] update error:", updateError.message);
      return { success: false, error: "Failed to update appointment." };
    }

    await supabase.from("audit_logs").insert({
      appointment_id: id,
      actor_id: user.id,
      event_type: "appointment_updated",
      metadata: {
        address_changed: addressChanged,
        status_at_edit: existing.status,
      },
    });

    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/appointments/${id}`);
    return { success: true, appointmentId: id };
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  const { data: created, error: insertError } = await supabase
    .from("appointments")
    .insert({
      ...row,
      source_type: "manual",
      status: "needs_review",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[saveAppointment] insert error:", insertError?.message);
    return { success: false, error: "Failed to create appointment." };
  }

  await supabase.from("audit_logs").insert({
    appointment_id: created.id,
    actor_id: user.id,
    event_type: "appointment_created",
    metadata: { source: "manual" },
  });

  revalidatePath("/admin/appointments");
  return { success: true, appointmentId: created.id };
}
