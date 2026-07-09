/**
 * Server Component — renders job notes with author info.
 *
 * Security: Internal notes (visibility = 'internal') are ONLY shown here,
 * in the admin-protected route. This component must never be used outside
 * of /admin/*. RLS enforces the same rule at the DB layer.
 */

import { Lock, Eye, MessageSquare } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NoteDeleteButton } from "./NoteDeleteButton";
import { type NoteVisibility } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

const VISIBILITY_CONFIG: Record<
  NoteVisibility,
  { label: string; icon: typeof Lock; className: string }
> = {
  internal: {
    label: "Internal",
    icon: Lock,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  client_visible: {
    label: "Client visible",
    icon: Eye,
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface NoteListProps {
  jobId: string;
}

export async function NoteList({ jobId }: NoteListProps) {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isConfigured) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Connect Supabase to view notes.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Service client — needed to join profiles across all author roles
  const service = await createServiceClient();

  // Fetch current user's role (to determine delete privilege)
  const { data: currentProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = currentProfile?.role === "owner_admin";

  const { data: notes, error } = await service
    .from("job_notes")
    .select(
      `
      id, body, visibility, created_at, author_id,
      author:profiles(display_name)
    `
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[NoteList] query error:", error.message);
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-destructive">Failed to load notes.</p>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <MessageSquare className="h-9 w-9 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium">No notes yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add an internal note or client-visible comment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {notes.map((note) => {
        const vis = VISIBILITY_CONFIG[note.visibility as NoteVisibility];
        const VisIcon = vis.icon;
        // Supabase may return the joined profile as an object or array
        const authorObj = Array.isArray(note.author)
          ? (note.author[0] as { display_name: string | null } | undefined)
          : (note.author as { display_name: string | null } | null);
        const authorName =
          authorObj?.display_name ?? `User ${note.author_id.slice(0, 6)}`;
        const canDelete = isAdmin || note.author_id === user.id;

        return (
          <li
            key={note.id}
            className="group relative rounded-lg border border-border bg-card p-4 shadow-xs"
          >
            {/* Header row */}
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {authorName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(note.created_at)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {/* Visibility badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${vis.className}`}
                >
                  <VisIcon className="h-3 w-3" />
                  {vis.label}
                </span>
                {/* Delete — visible on hover, author or admin only */}
                {canDelete && <NoteDeleteButton noteId={note.id} />}
              </div>
            </div>

            {/* Body */}
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {note.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
