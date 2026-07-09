"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

const SaveReportSchema = z.object({
  job_id: z.string().uuid(),
  title: z.string().min(1, { message: "Title is required." }),
  condition_summary: z.string().optional(),
  condition_details: z.string().optional(),
  valuation_conclusion_dollars: z.coerce
    .number()
    .nonnegative()
    .optional()
    .nullable(),
  valuation_method: z.string().optional(),
  valuation_notes: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveReportResult {
  success: boolean;
  error?: string;
  reportId?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function saveReport(
  _prev: SaveReportResult | null,
  formData: FormData
): Promise<SaveReportResult> {
  // ── Dev bypass ──────────────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  // ── Validate ────────────────────────────────────────────────────────────────
  const raw = {
    job_id: formData.get("job_id") as string,
    title: (formData.get("title") as string) ?? "",
    condition_summary: (formData.get("condition_summary") as string) || undefined,
    condition_details: (formData.get("condition_details") as string) || undefined,
    valuation_conclusion_dollars:
      (formData.get("valuation_conclusion_dollars") as string) || undefined,
    valuation_method: (formData.get("valuation_method") as string) || undefined,
    valuation_notes: (formData.get("valuation_notes") as string) || undefined,
  };

  const parsed = SaveReportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const {
    job_id,
    title,
    condition_summary,
    condition_details,
    valuation_conclusion_dollars,
    valuation_method,
    valuation_notes,
  } = parsed.data;

  // Convert dollars → cents (null if not provided)
  const valuation_conclusion_cents =
    valuation_conclusion_dollars != null
      ? Math.round(valuation_conclusion_dollars * 100)
      : null;

  // ── Job access via RLS ──────────────────────────────────────────────────────
  const { error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", job_id)
    .single();

  if (jobError) {
    return { success: false, error: "Job not found or access denied." };
  }

  // ── Check for existing report ───────────────────────────────────────────────
  const service = await createServiceClient();

  const { data: existing } = await service
    .from("appraisal_reports")
    .select("id, is_draft")
    .eq("job_id", job_id)
    .single();

  if (existing) {
    // Cannot overwrite a finalized report
    if (!existing.is_draft) {
      return {
        success: false,
        error: "This report has been finalized and cannot be edited.",
      };
    }

    // Update existing draft (preserve authored_by + finalized fields)
    const { error: updateError } = await service
      .from("appraisal_reports")
      .update({
        title,
        condition_summary: condition_summary ?? null,
        condition_details: condition_details ?? null,
        valuation_conclusion_cents,
        valuation_method: valuation_method ?? null,
        valuation_notes: valuation_notes ?? null,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[saveReport] update error:", updateError.message);
      return { success: false, error: "Failed to save report." };
    }

    revalidatePath(`/admin/jobs/${job_id}`);
    return { success: true, reportId: existing.id };
  }

  // ── Insert new report ───────────────────────────────────────────────────────
  const { data: newReport, error: insertError } = await service
    .from("appraisal_reports")
    .insert({
      job_id,
      authored_by: user.id,
      title,
      condition_summary: condition_summary ?? null,
      condition_details: condition_details ?? null,
      valuation_conclusion_cents,
      valuation_method: valuation_method ?? null,
      valuation_notes: valuation_notes ?? null,
      is_draft: true,
    })
    .select("id")
    .single();

  if (insertError || !newReport) {
    console.error("[saveReport] insert error:", insertError?.message);
    return { success: false, error: "Failed to create report." };
  }

  // Audit log — only on first creation
  await service.from("audit_logs").insert({
    job_id,
    actor_id: user.id,
    event_type: "report_generated",
    metadata: { report_id: newReport.id },
  });

  revalidatePath(`/admin/jobs/${job_id}`);
  return { success: true, reportId: newReport.id };
}
