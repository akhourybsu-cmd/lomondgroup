"use server";

import { redirect } from "next/navigation";
import { fullIntakeSchema, CLAIM_TYPES } from "@/components/intake/schemas";

/**
 * Server Action: Submit the public intake form.
 *
 * Creates a client record, a vehicle record, and an appraisal_job record
 * in Supabase, then redirects to the confirmation page.
 *
 * Uses the service-role client to bypass RLS — this action is server-only
 * and the key is never sent to the browser.
 */
export async function submitIntake(
  _prevState: { success: false; error: string } | null,
  formData: unknown
): Promise<{ success: false; error: string }> {
  // ── 1. Validate ────────────────────────────────────────────────────────────
  const parsed = fullIntakeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data. Please check your entries and try again." };
  }
  const data = parsed.data;

  // ── 2. Check Supabase is configured ────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Dev mode without Supabase — simulate success so the flow can be tested
    console.warn(
      "[submitIntake] Supabase not configured — skipping DB write and redirecting."
    );
    redirect("/request/confirmation");
  }

  // ── 3. Get service client ──────────────────────────────────────────────────
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = await createServiceClient();

  // ── 4. Upsert client record ────────────────────────────────────────────────
  // Check for existing client by email to avoid duplicates
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("email", data.contact.email)
    .maybeSingle();

  let clientId: string;

  if (existingClient) {
    // Update contact details in case anything changed
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        first_name: data.contact.first_name,
        last_name: data.contact.last_name,
        phone: data.contact.phone,
        preferred_contact: data.contact.preferred_contact,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingClient.id);

    if (updateError) {
      console.error("[submitIntake] Client update failed:", updateError);
      return { success: false, error: "Failed to save your information. Please try again." };
    }
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert({
        first_name: data.contact.first_name,
        last_name: data.contact.last_name,
        email: data.contact.email,
        phone: data.contact.phone,
        preferred_contact: data.contact.preferred_contact,
      })
      .select("id")
      .single();

    if (insertError || !newClient) {
      console.error("[submitIntake] Client insert failed:", insertError);
      return { success: false, error: "Failed to save your information. Please try again." };
    }
    clientId = newClient.id;
  }

  // ── 5. Insert vehicle record ───────────────────────────────────────────────
  const { data: newVehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      year: data.vehicle.year,
      make: data.vehicle.make,
      model: data.vehicle.model,
      trim: data.vehicle.trim || null,
      vin: data.vehicle.vin || null,
      mileage: data.vehicle.mileage ?? null,
      location_city: data.vehicle.location_city,
      location_state: data.vehicle.location_state,
      is_drivable: data.vehicle.is_drivable ?? null,
    })
    .select("id")
    .single();

  if (vehicleError || !newVehicle) {
    console.error("[submitIntake] Vehicle insert failed:", vehicleError);
    return { success: false, error: "Failed to save vehicle information. Please try again." };
  }

  // ── 6. Insert appraisal_job record ────────────────────────────────────────
  const claimFields = CLAIM_TYPES.has(data.type.appraisal_type) && data.claim
    ? {
        insurance_company: data.claim.insurance_company || null,
        claim_number: data.claim.claim_number || null,
        date_of_loss: data.claim.date_of_loss || null,
        vehicle_repaired: data.claim.vehicle_repaired ?? null,
        has_repair_estimate: data.claim.has_repair_estimate ?? null,
        has_settlement_offer: data.claim.has_settlement_offer ?? null,
      }
    : {
        insurance_company: null,
        claim_number: null,
        date_of_loss: null,
        vehicle_repaired: null,
        has_repair_estimate: null,
        has_settlement_offer: null,
      };

  const { error: jobError } = await supabase.from("appraisal_jobs").insert({
    client_id: clientId,
    vehicle_id: newVehicle.id,
    appraisal_type: data.type.appraisal_type,
    status: "new_request",
    customer_notes: data.notes.customer_notes || null,
    priority: "normal",
    ...claimFields,
  });

  if (jobError) {
    console.error("[submitIntake] Job insert failed:", jobError);
    return { success: false, error: "Failed to submit your request. Please try again." };
  }

  // ── 7. Redirect on success ─────────────────────────────────────────────────
  redirect("/request/confirmation");
}
