"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface DeleteNoteResult {
  success: boolean;
  error?: string;
}

export async function deleteNote(noteId: string): Promise<DeleteNoteResult> {
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

  const service = await createServiceClient();

  // ── Fetch the note (service client — author check requires full record) ───
  const { data: note, error: fetchError } = await service
    .from("job_notes")
    .select("id, job_id, author_id")
    .eq("id", noteId)
    .single();

  if (fetchError || !note) {
    return { success: false, error: "Note not found." };
  }

  // ── Authorisation: author OR owner_admin ─────────────────────────────────
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAuthor = note.author_id === user.id;
  const isAdmin = profile?.role === "owner_admin";

  if (!isAuthor && !isAdmin) {
    return { success: false, error: "Permission denied." };
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const { error: deleteError } = await service
    .from("job_notes")
    .delete()
    .eq("id", noteId);

  if (deleteError) {
    return { success: false, error: "Failed to delete note." };
  }

  revalidatePath(`/admin/jobs/${note.job_id}`);
  return { success: true };
}
