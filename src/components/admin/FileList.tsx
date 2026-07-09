/**
 * Server Component — renders files for a job with server-generated signed URLs.
 *
 * Security guarantee: storage_path is fetched and used entirely server-side to
 * generate short-lived signed URLs. It is never included in JSX props or sent
 * to the browser in any form.
 */

import { ExternalLink, FileText, Image, Inbox } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FileDeleteButton } from "./FileDeleteButton";
import { type FileCategory } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FileCategory, string> = {
  vehicle_photo: "Vehicle Photo",
  damage_photo: "Damage Photo",
  repair_estimate: "Repair Estimate",
  insurance_valuation: "Insurance Valuation",
  settlement_offer: "Settlement Offer",
  appraisal_report: "Appraisal Report",
  other: "Other",
};

// Signed URL TTL — 1 hour is appropriate for admin sessions
const SIGNED_URL_TTL_SECONDS = 3600;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) {
    return <Image className="h-5 w-5 shrink-0 text-brand-navy/60" />;
  }
  return <FileText className="h-5 w-5 shrink-0 text-brand-navy/60" />;
}

// ── Exported type (no storage_path) ──────────────────────────────────────────

type SafeFileRow = {
  id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  category: FileCategory;
  created_at: string;
  signedUrl: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

interface FileListProps {
  jobId: string;
}

export async function FileList({ jobId }: FileListProps) {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isConfigured) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Connect Supabase to manage files.
        </p>
      </div>
    );
  }

  // Verify the requesting user is authenticated (anon client, respects RLS)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch file metadata INCLUDING storage_path — used only server-side below
  const service = await createServiceClient();
  const { data: rawFiles, error } = await service
    .from("uploaded_files")
    .select(
      "id, file_name, file_size_bytes, mime_type, category, created_at, storage_path"
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[FileList] query error:", error.message);
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">Failed to load files.</p>
      </div>
    );
  }

  if (!rawFiles || rawFiles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Inbox className="h-9 w-9 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium">No files yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Upload files using the form below.
          </p>
        </div>
      </div>
    );
  }

  // Generate signed URLs server-side — storage_path never leaves this function
  const files: SafeFileRow[] = await Promise.all(
    rawFiles.map(async (raw) => {
      const { data: urlData } = await service.storage
        .from("job-files")
        .createSignedUrl(raw.storage_path, SIGNED_URL_TTL_SECONDS);

      return {
        id: raw.id,
        file_name: raw.file_name,
        file_size_bytes: raw.file_size_bytes,
        mime_type: raw.mime_type,
        category: raw.category as FileCategory,
        created_at: raw.created_at,
        signedUrl: urlData?.signedUrl ?? null,
        // storage_path intentionally excluded
      };
    })
  );

  return (
    <div className="divide-y divide-border">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-4 py-3"
        >
          {/* Icon */}
          <FileTypeIcon mimeType={file.mime_type} />

          {/* Meta */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[file.category]} ·{" "}
              {formatFileSize(file.file_size_bytes)} ·{" "}
              {formatDate(file.created_at)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {file.signedUrl ? (
              <a
                href={file.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-navy/40 hover:text-brand-navy"
                title="Opens in new tab — link expires in 1 hour"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                Unavailable
              </span>
            )}
            <FileDeleteButton fileId={file.id} fileName={file.file_name} />
          </div>
        </div>
      ))}
    </div>
  );
}
