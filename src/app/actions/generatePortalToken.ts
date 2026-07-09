"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratePortalTokenResult {
  success: boolean;
  error?: string;
  token?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Admin action — regenerates the portal_token for a job.
 * Invalidates any previously shared portal links for this job.
 */
export async function generatePortalToken(
  jobId: string
): Promise<GeneratePortalTokenResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  // ── Auth: admin or assigned staff only ──────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  // Verify job access via RLS
  const { error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", jobId)
    .single();

  if (jobError) {
    return { success: false, error: "Job not found or access denied." };
  }

  const service = await createServiceClient();

  // Generate a new random UUID token
  const { data, error: updateError } = await service
    .from("appraisal_jobs")
    .update({ portal_token: crypto.randomUUID() })
    .eq("id", jobId)
    .select("portal_token")
    .single();

  if (updateError || !data) {
    return { success: false, error: "Failed to regenerate portal link." };
  }

  revalidatePath(`/admin/jobs/${jobId}`);
  return { success: true, token: data.portal_token as string };
}
