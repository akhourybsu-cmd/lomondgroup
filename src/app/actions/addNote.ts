"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type NoteVisibility } from "@/lib/types";

export interface AddNoteResult {
  success: boolean;
  error?: string;
}

const VALID_VISIBILITY = new Set<NoteVisibility>(["internal", "client_visible"]);

export async function addNote(
  _prev: AddNoteResult | null,
  formData: FormData
): Promise<AddNoteResult> {
  // ── Dev bypass ────────────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
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
  const body = (formData.get("body") as string | null)?.trim();
  const visibility = formData.get("visibility") as NoteVisibility | null;

  if (!jobId) return { success: false, error: "Missing job ID." };
  if (!body || body.length === 0)
    return { success: false, error: "Note body is required." };
  if (!visibility || !VALID_VISIBILITY.has(visibility))
    return { success: false, error: "Invalid visibility." };

  // ── Verify job access via RLS ─────────────────────────────────────────────
  const { data: job, error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job not found or access denied." };
  }

  // ── Insert note ───────────────────────────────────────────────────────────
  const { error: insertError } = await supabase.from("job_notes").insert({
    job_id: jobId,
    author_id: user.id,
    visibility,
    body,
  });

  if (insertError) {
    console.error("[addNote] insert error:", insertError.message);
    return { success: false, error: "Failed to save note." };
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    job_id: jobId,
    actor_id: user.id,
    event_type: "note_added",
    metadata: { visibility },
  });

  revalidatePath(`/admin/jobs/${jobId}`);
  return { success: true };
}
