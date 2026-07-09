"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface GetPdfSignedUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Generate a short-lived signed URL for viewing an uploaded PDF.
 * Access is verified through RLS (anon client) before the service
 * client signs the URL; the raw storage_path never leaves the server.
 */
export async function getPdfSignedUrl(
  uploadId: string
): Promise<GetPdfSignedUrlResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: upload } = await supabase
    .from("pdf_uploads")
    .select("storage_path")
    .eq("id", uploadId)
    .single();
  if (!upload) return { success: false, error: "Upload not found." };

  const service = await createServiceClient();
  const { data, error } = await service.storage
    .from("assignment-pdfs")
    .createSignedUrl(upload.storage_path, 600);
  if (error || !data) {
    return { success: false, error: "Could not generate a link to the PDF." };
  }

  return { success: true, url: data.signedUrl };
}
