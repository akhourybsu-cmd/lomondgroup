"use server";

import React from "react";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import ReactPDF from "@react-pdf/renderer";
import {
  AppraisalReportPDF,
  type PDFReportData,
} from "@/components/report/AppraisalReportPDF";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinalizeReportResult {
  success: boolean;
  error?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function finalizeReport(
  reportId: string
): Promise<FinalizeReportResult> {
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

  const service = await createServiceClient();

  // ── Fetch report ────────────────────────────────────────────────────────────
  const { data: report, error: reportError } = await service
    .from("appraisal_reports")
    .select(
      `
      id, job_id, authored_by, title,
      condition_summary, condition_details,
      valuation_conclusion_cents, valuation_method, valuation_notes,
      is_draft
    `
    )
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    return { success: false, error: "Report not found." };
  }
  if (!report.is_draft) {
    return { success: false, error: "Report is already finalized." };
  }

  // ── Authorisation: author OR owner_admin ────────────────────────────────────
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAuthor = report.authored_by === user.id;
  const isAdmin = profile?.role === "owner_admin";

  if (!isAuthor && !isAdmin) {
    return { success: false, error: "Permission denied." };
  }

  // ── Fetch job + vehicle + client ────────────────────────────────────────────
  const { data: job } = await service
    .from("appraisal_jobs")
    .select(
      `
      id, internal_ref, appraisal_type,
      client:clients(first_name, last_name, email, phone),
      vehicle:vehicles(year, make, model, trim, vin, mileage, color, location_city, location_state)
    `
    )
    .eq("id", report.job_id)
    .single();

  // ── Fetch market comparables ────────────────────────────────────────────────
  const { data: comparables } = await service
    .from("market_comparables")
    .select(
      "year, make, model, trim, mileage, condition, sale_price_cents, source, listing_date"
    )
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  // ── Build PDF data ──────────────────────────────────────────────────────────
  // Supabase may return joined relations as array or object — handle both
  const clientRaw = job
    ? Array.isArray(job.client)
      ? (job.client[0] as PDFReportData["client"])
      : (job.client as PDFReportData["client"])
    : undefined;

  const vehicleRaw = job
    ? Array.isArray(job.vehicle)
      ? (job.vehicle[0] as PDFReportData["vehicle"])
      : (job.vehicle as PDFReportData["vehicle"])
    : undefined;

  const pdfData: PDFReportData = {
    report: {
      title: report.title,
      condition_summary: report.condition_summary,
      condition_details: report.condition_details,
      valuation_conclusion_cents: report.valuation_conclusion_cents,
      valuation_method: report.valuation_method,
      valuation_notes: report.valuation_notes,
    },
    job: {
      internal_ref: job?.internal_ref ?? reportId.slice(0, 8).toUpperCase(),
      appraisal_type: job?.appraisal_type ?? null,
    },
    client: clientRaw ?? null,
    vehicle: vehicleRaw ?? null,
    comparables: (comparables ?? []) as PDFReportData["comparables"],
    generatedAt: new Date().toISOString(),
  };

  // ── Generate PDF ────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    // renderToBuffer uses @react-pdf's own renderer. Our component renders a
    // Document at its root, so the cast is safe at runtime. TypeScript can't
    // infer the props chain through the renderer boundary, so we widen here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfBuffer = await ReactPDF.renderToBuffer(
      React.createElement(AppraisalReportPDF, pdfData) as any
    );
  } catch (err) {
    console.error("[finalizeReport] PDF generation error:", err);
    return { success: false, error: "Failed to generate PDF." };
  }

  // ── Upload to private storage ───────────────────────────────────────────────
  const storagePath = `${report.job_id}/${reportId}.pdf`;

  const { error: uploadError } = await service.storage
    .from("appraisal-reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[finalizeReport] storage upload error:", uploadError.message);
    return { success: false, error: "Failed to upload PDF." };
  }

  // ── Mark report as finalized ────────────────────────────────────────────────
  const { error: updateError } = await service
    .from("appraisal_reports")
    .update({
      is_draft: false,
      finalized_at: new Date().toISOString(),
      pdf_storage_path: storagePath,
    })
    .eq("id", reportId);

  if (updateError) {
    // Attempt to clean up orphaned upload
    await service.storage.from("appraisal-reports").remove([storagePath]);
    return { success: false, error: "Failed to update report status." };
  }

  // ── Audit log ───────────────────────────────────────────────────────────────
  await service.from("audit_logs").insert({
    job_id: report.job_id,
    actor_id: user.id,
    event_type: "report_finalized",
    metadata: { report_id: reportId },
  });

  revalidatePath(`/admin/jobs/${report.job_id}`);
  return { success: true };
}
