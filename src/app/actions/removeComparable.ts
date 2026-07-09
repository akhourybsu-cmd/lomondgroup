"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RemoveComparableResult {
  success: boolean;
  error?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function removeComparable(
  comparableId: string
): Promise<RemoveComparableResult> {
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

  // ── Fetch comparable + report for access check ──────────────────────────────
  const { data: comparable } = await service
    .from("market_comparables")
    .select(
      `
      id,
      report:appraisal_reports(id, job_id, is_draft)
    `
    )
    .eq("id", comparableId)
    .single();

  if (!comparable) {
    return { success: false, error: "Comparable not found." };
  }

  const reportData = Array.isArray(comparable.report)
    ? (comparable.report[0] as {
        id: string;
        job_id: string;
        is_draft: boolean;
      } | undefined)
    : (comparable.report as {
        id: string;
        job_id: string;
        is_draft: boolean;
      } | null);

  if (!reportData?.job_id) {
    return { success: false, error: "Associated job not found." };
  }

  if (!reportData.is_draft) {
    return {
      success: false,
      error: "Cannot remove comparables from a finalized report.",
    };
  }

  // Verify job access via RLS
  const { error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", reportData.job_id)
    .single();

  if (jobError) {
    return { success: false, error: "Access denied." };
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const { error: deleteError } = await service
    .from("market_comparables")
    .delete()
    .eq("id", comparableId);

  if (deleteError) {
    return { success: false, error: "Failed to remove comparable." };
  }

  revalidatePath(`/admin/jobs/${reportData.job_id}`);
  return { success: true };
}
