"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/ops/pdf/extractText";
import { parseAppointmentsFromText } from "@/lib/ops/pdf/parseAppointments";
import { findPossibleDuplicates } from "@/lib/ops/appointments/duplicates";

export interface ProcessPdfUploadResult {
  success: boolean;
  appointmentsCreated?: number;
  message?: string;
  error?: string;
}

/**
 * Process an uploaded assignment PDF: extract the text layer, run
 * AI-assisted structured extraction, and create draft appointments
 * with status 'needs_review'. Nothing is auto-confirmed; the original
 * PDF, raw text, and raw AI output are all preserved. Safe to re-run —
 * each run creates fresh drafts (flagged as possible duplicates).
 */
export async function processPdfUpload(
  uploadId: string
): Promise<ProcessPdfUploadResult> {
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

  const { data: upload } = await supabase
    .from("pdf_uploads")
    .select("*")
    .eq("id", uploadId)
    .single();
  if (!upload) return { success: false, error: "Upload not found." };
  if (upload.processing_status === "processing") {
    return { success: false, error: "This upload is already being processed." };
  }

  const fail = async (message: string) => {
    await supabase
      .from("pdf_uploads")
      .update({ processing_status: "failed", extraction_error: message })
      .eq("id", uploadId);
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      event_type: "pdf_processing_failed",
      metadata: { pdf_upload_id: uploadId, error: message },
    });
    revalidatePath("/admin/uploads");
    revalidatePath(`/admin/uploads/${uploadId}`);
    return { success: false, error: message };
  };

  await supabase
    .from("pdf_uploads")
    .update({ processing_status: "processing", extraction_error: null })
    .eq("id", uploadId);

  // ── 1. Download the original PDF ────────────────────────────────────────────
  const service = await createServiceClient();
  const { data: fileData, error: downloadError } = await service.storage
    .from("assignment-pdfs")
    .download(upload.storage_path);
  if (downloadError || !fileData) {
    return fail("The stored PDF could not be read. Try re-uploading the file.");
  }

  // ── 2. Extract the text layer ───────────────────────────────────────────────
  const textResult = await extractPdfText(await fileData.arrayBuffer());
  if (!textResult.ok) {
    return fail(textResult.message);
  }

  await supabase
    .from("pdf_uploads")
    .update({
      raw_extracted_text: textResult.text,
      page_count: textResult.pageCount,
    })
    .eq("id", uploadId);

  // ── 3. AI-assisted structured extraction ────────────────────────────────────
  const parsed = await parseAppointmentsFromText(textResult.text);
  if (!parsed.ok) {
    return fail(
      `${parsed.error} The raw text was saved — you can review it and enter the appointment manually.`
    );
  }

  const { result } = parsed;

  if (!result.is_appointment_document || result.appointments.length === 0) {
    await supabase
      .from("pdf_uploads")
      .update({
        processing_status: "needs_review",
        extraction_model: parsed.model,
        extraction_error: `We could not find appointment details in this PDF (${result.document_summary}). You can review the extracted text, enter the appointment manually, or mark this upload as not usable.`,
      })
      .eq("id", uploadId);
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      event_type: "pdf_processed",
      metadata: { pdf_upload_id: uploadId, appointments_created: 0 },
    });
    revalidatePath("/admin/uploads");
    revalidatePath(`/admin/uploads/${uploadId}`);
    return {
      success: true,
      appointmentsCreated: 0,
      message: "No appointment details were found in this document.",
    };
  }

  // ── 4. Contractor matching ──────────────────────────────────────────────────
  const { data: contractors } = await supabase
    .from("contractors")
    .select("id, name, default_duration_minutes");

  const matchContractor = (name: string | null): string | null => {
    if (upload.contractor_id) return upload.contractor_id;
    if (!name || !contractors) return null;
    const normalized = name.trim().toLowerCase();
    const hit = contractors.find(
      (c) =>
        c.name.toLowerCase() === normalized ||
        c.name.toLowerCase().includes(normalized) ||
        normalized.includes(c.name.toLowerCase())
    );
    return hit?.id ?? null;
  };

  // ── 5. Create draft appointments ────────────────────────────────────────────
  let created = 0;
  let anyLowConfidence = false;

  for (const extracted of result.appointments) {
    const contractorId = matchContractor(extracted.contractor_name);
    const contractorDefault = contractors?.find((c) => c.id === contractorId)
      ?.default_duration_minutes;

    const duplicates = await findPossibleDuplicates(supabase, {
      claim_number: extracted.claim_number,
      vin: extracted.vin,
      customer_name: extracted.customer_name,
      appointment_date: extracted.appointment_date,
    });

    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        contractor_id: contractorId,
        pdf_upload_id: uploadId,
        source_type: "pdf_extraction",
        status: "needs_review",
        customer_name: extracted.customer_name,
        customer_phone: extracted.customer_phone,
        customer_email: extracted.customer_email,
        address_line_1: extracted.address_line_1,
        address_line_2: extracted.address_line_2,
        city: extracted.city,
        state: extracted.state,
        zip: extracted.zip,
        appointment_date: extracted.appointment_date,
        appointment_time: extracted.appointment_time,
        time_window_start: extracted.time_window_start,
        time_window_end: extracted.time_window_end,
        estimated_duration_minutes: contractorDefault ?? 45,
        claim_number: extracted.claim_number,
        reference_number: extracted.reference_number,
        insurance_company: extracted.insurance_company,
        vehicle_year: extracted.vehicle_year,
        vehicle_make: extracted.vehicle_make,
        vehicle_model: extracted.vehicle_model,
        vin: extracted.vin,
        vehicle_location_notes: extracted.vehicle_location_notes,
        damage_notes: extracted.damage_notes,
        special_instructions: extracted.special_instructions,
        internal_notes:
          duplicates.length > 0
            ? `Possible duplicate — ${duplicates[0].reason}. Review before confirming.`
            : null,
        extraction_snapshot: extracted as unknown as Record<string, unknown>,
        extraction_confidence: Math.max(0, Math.min(1, extracted.confidence)),
        missing_fields: extracted.missing_or_uncertain_fields ?? [],
      })
      .select("id")
      .single();

    if (insertError || !appointment) {
      console.error("[processPdfUpload] appointment insert:", insertError?.message);
      continue;
    }

    if (extracted.confidence < 0.6 || duplicates.length > 0) anyLowConfidence = true;

    await supabase.from("audit_logs").insert({
      appointment_id: appointment.id,
      actor_id: user.id,
      event_type: "appointment_created",
      metadata: {
        source: "pdf_extraction",
        pdf_upload_id: uploadId,
        confidence: extracted.confidence,
        possible_duplicates: duplicates.map((d) => d.appointmentId),
      },
    });

    created++;
  }

  if (created === 0) {
    return fail(
      "Extraction succeeded but the appointments could not be saved. Try again."
    );
  }

  // ── 6. Finalize the upload row ──────────────────────────────────────────────
  await supabase
    .from("pdf_uploads")
    .update({
      processing_status: anyLowConfidence ? "needs_review" : "processed",
      extraction_model: parsed.model,
    })
    .eq("id", uploadId);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    event_type: "pdf_processed",
    metadata: { pdf_upload_id: uploadId, appointments_created: created },
  });

  revalidatePath("/admin/uploads");
  revalidatePath(`/admin/uploads/${uploadId}`);
  revalidatePath("/admin/appointments");
  revalidatePath("/admin");

  return {
    success: true,
    appointmentsCreated: created,
    message: `${created} appointment${created !== 1 ? "s" : ""} extracted — review and confirm ${created !== 1 ? "them" : "it"}.`,
  };
}
