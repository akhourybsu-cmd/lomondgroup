"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { type FileCategory } from "@/lib/types";

export interface UploadFileResult {
  success: boolean;
  error?: string;
  fileId?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

// Matches the storage bucket's file_size_limit (50 MB)
const MAX_SIZE_BYTES = 52_428_800;

const VALID_CATEGORIES = new Set<FileCategory>([
  "vehicle_photo",
  "damage_photo",
  "repair_estimate",
  "insurance_valuation",
  "settlement_offer",
  "appraisal_report",
  "other",
]);

export async function uploadFile(
  _prev: UploadFileResult | null,
  formData: FormData
): Promise<UploadFileResult> {
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

  // ── Parse + validate inputs ───────────────────────────────────────────────
  const jobId = (formData.get("job_id") as string | null)?.trim();
  const category = formData.get("category") as FileCategory | null;
  const file = formData.get("file") as File | null;

  if (!jobId) return { success: false, error: "Missing job ID." };
  if (!category || !VALID_CATEGORIES.has(category))
    return { success: false, error: "Invalid file category." };
  if (!file || file.size === 0)
    return { success: false, error: "No file selected." };

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      success: false,
      error: "File type not allowed. Use JPEG, PNG, WEBP, HEIC, or PDF.",
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: "File exceeds the 50 MB limit." };
  }

  // ── Verify the job exists and the user can access it ─────────────────────
  // Using the anon client (with RLS) ensures the user can only upload to
  // jobs their role grants access to.
  const { data: job, error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job not found or access denied." };
  }

  // ── Build a safe, unique storage path ─────────────────────────────────────
  // Path: {job_id}/{uuid}_{sanitised_filename}
  // storage_path is stored in the DB and NEVER returned to the browser.
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);
  const storagePath = `${jobId}/${randomUUID()}_${safeName}`;

  // ── Upload to Storage (service client bypasses storage RLS) ───────────────
  const service = await createServiceClient();

  const { error: storageError } = await service.storage
    .from("job-files")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    console.error("[uploadFile] storage error:", storageError.message);
    return { success: false, error: "Storage upload failed. Please try again." };
  }

  // ── Insert metadata row ───────────────────────────────────────────────────
  // storage_path is stored here but NEVER returned to the client.
  const { data: fileRecord, error: dbError } = await service
    .from("uploaded_files")
    .insert({
      job_id: jobId,
      uploaded_by: user.id,
      file_name: file.name,
      storage_path: storagePath, // server-side only
      file_size_bytes: file.size,
      mime_type: file.type,
      category,
    })
    .select("id")
    .single();

  if (dbError || !fileRecord) {
    // Clean up the orphaned storage object
    await service.storage.from("job-files").remove([storagePath]);
    return { success: false, error: "Failed to save file metadata." };
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await service.from("audit_logs").insert({
    job_id: jobId,
    actor_id: user.id,
    event_type: "file_uploaded",
    metadata: {
      file_id: fileRecord.id,
      file_name: file.name,
      category,
      file_size_bytes: file.size,
    },
  });

  revalidatePath(`/admin/jobs/${jobId}`);

  // Return only the file ID — storage_path stays server-side
  return { success: true, fileId: fileRecord.id };
}
