"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface DeleteFileResult {
  success: boolean;
  error?: string;
}

export async function deleteFile(fileId: string): Promise<DeleteFileResult> {
  // ── Dev bypass ────────────────────────────────────────────────────────────
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return { success: false, error: "Supabase not configured." };
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  const service = await createServiceClient();

  // ── Fetch the file record server-side (storage_path stays here) ───────────
  const { data: file, error: fetchError } = await service
    .from("uploaded_files")
    .select("id, job_id, storage_path, file_name")
    .eq("id", fileId)
    .single();

  if (fetchError || !file) {
    return { success: false, error: "File not found." };
  }

  // ── Verify the actor has access to this job (RLS via anon client) ─────────
  const { data: job, error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", file.job_id)
    .single();

  if (jobError || !job) {
    return { success: false, error: "Access denied." };
  }

  // ── Delete from Storage ───────────────────────────────────────────────────
  const { error: storageError } = await service.storage
    .from("job-files")
    .remove([file.storage_path]);

  if (storageError) {
    // Log but continue — DB record must be cleaned up regardless
    console.error("[deleteFile] storage remove error:", storageError.message);
  }

  // ── Delete metadata row ───────────────────────────────────────────────────
  const { error: dbError } = await service
    .from("uploaded_files")
    .delete()
    .eq("id", fileId);

  if (dbError) {
    return { success: false, error: "Failed to delete file record." };
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await service.from("audit_logs").insert({
    job_id: file.job_id,
    actor_id: user.id,
    event_type: "file_viewed", // closest available; metadata clarifies action
    metadata: {
      action: "deleted",
      file_id: fileId,
      file_name: file.file_name,
    },
  });

  revalidatePath(`/admin/jobs/${file.job_id}`);

  return { success: true };
}
