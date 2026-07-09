"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches the bucket limit

export interface UploadAssignmentPdfsResult {
  success: boolean;
  uploadedCount?: number;
  warnings?: string[];
  error?: string;
}

/**
 * Accept one or more assignment PDFs: store the original file in the
 * private assignment-pdfs bucket, create a pdf_uploads row (pending),
 * and flag duplicate uploads by content hash. Processing (text
 * extraction + AI parsing) is a separate explicit step.
 */
export async function uploadAssignmentPdfs(
  _prev: UploadAssignmentPdfsResult | null,
  formData: FormData
): Promise<UploadAssignmentPdfsResult> {
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

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { success: false, error: "Choose at least one PDF file." };
  }

  const contractorId = formData.get("contractor_id");
  const contractor =
    typeof contractorId === "string" && contractorId ? contractorId : null;

  const service = await createServiceClient();
  const warnings: string[] = [];
  let uploadedCount = 0;

  for (const file of files) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      warnings.push(`${file.name}: not a PDF — skipped.`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      warnings.push(`${file.name}: larger than 25 MB — skipped.`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = createHash("sha256").update(buffer).digest("hex");

    // Duplicate-upload detection (flag, never block)
    const { data: existing } = await supabase
      .from("pdf_uploads")
      .select("id, original_filename")
      .eq("content_hash", contentHash)
      .limit(1);
    const duplicateOf = existing?.[0];

    const id = randomUUID();
    const safeName = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 150);
    const storagePath = `${id}/${safeName}`;

    const { error: storageError } = await service.storage
      .from("assignment-pdfs")
      .upload(storagePath, buffer, { contentType: "application/pdf" });
    if (storageError) {
      console.error("[uploadAssignmentPdfs] storage error:", storageError.message);
      warnings.push(`${file.name}: upload failed — try again.`);
      continue;
    }

    const { error: insertError } = await supabase.from("pdf_uploads").insert({
      id,
      contractor_id: contractor,
      uploaded_by: user.id,
      original_filename: file.name,
      storage_path: storagePath,
      file_size_bytes: file.size,
      content_hash: contentHash,
      processing_status: "pending",
      extraction_error: duplicateOf
        ? `Possible duplicate upload — same file contents as "${duplicateOf.original_filename}".`
        : null,
    });
    if (insertError) {
      console.error("[uploadAssignmentPdfs] insert error:", insertError.message);
      await service.storage.from("assignment-pdfs").remove([storagePath]);
      warnings.push(`${file.name}: could not be saved — try again.`);
      continue;
    }

    if (duplicateOf) {
      warnings.push(
        `${file.name}: same contents as an earlier upload — review before processing.`
      );
    }

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      event_type: "pdf_uploaded",
      metadata: { pdf_upload_id: id, filename: file.name, size_bytes: file.size },
    });

    uploadedCount++;
  }

  if (uploadedCount === 0) {
    return {
      success: false,
      error: warnings.join(" ") || "No files could be uploaded.",
    };
  }

  revalidatePath("/admin/uploads");
  return { success: true, uploadedCount, warnings };
}
