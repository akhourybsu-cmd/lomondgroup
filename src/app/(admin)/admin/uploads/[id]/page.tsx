import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentStatusBadge } from "@/components/ops/AppointmentStatusBadge";
import {
  ProcessUploadButton,
  ViewPdfButton,
} from "@/components/ops/UploadActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  type AppointmentStatus,
  type UploadProcessingStatus,
  UPLOAD_STATUS_CONFIG,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateOnly, shortLocation } from "@/lib/ops/format";
import { AlertTriangle } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return { title: "Upload — Lomond Appraisal Admin" };
}

type ExtractedRow = {
  id: string;
  customer_name: string | null;
  appointment_date: string | null;
  city: string | null;
  state: string | null;
  claim_number: string | null;
  status: AppointmentStatus;
  extraction_confidence: number | null;
  missing_fields: string[];
};

export default async function UploadDetailPage({ params }: PageProps) {
  const { id } = await params;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const [{ data: upload }, { data: appointments }] = await Promise.all([
    supabase
      .from("pdf_uploads")
      .select("*, contractor:contractors(id, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("appointments")
      .select(
        "id, customer_name, appointment_date, city, state, claim_number, status, extraction_confidence, missing_fields"
      )
      .eq("pdf_upload_id", id)
      .order("created_at"),
  ]);

  if (!upload) notFound();

  const status = upload.processing_status as UploadProcessingStatus;
  const config = UPLOAD_STATUS_CONFIG[status];
  const extracted = (appointments ?? []) as ExtractedRow[];
  const canProcess = status === "pending" || status === "failed" || status === "needs_review";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Uploads", href: "/admin/uploads" },
          { label: upload.original_filename },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {upload.original_filename}
              </h1>
              <Badge
                variant="outline"
                className={cn("border font-medium", config.color, config.bgColor)}
              >
                {config.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {upload.contractor?.name ?? "No contractor assigned"}
              {upload.page_count ? ` · ${upload.page_count} page${upload.page_count !== 1 ? "s" : ""}` : ""}
              {` · ${(upload.file_size_bytes / 1024 / 1024).toFixed(1)} MB`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ViewPdfButton uploadId={upload.id} />
            {canProcess && (
              <ProcessUploadButton
                uploadId={upload.id}
                variant={status === "pending" ? "process" : "retry"}
              />
            )}
          </div>
        </div>

        {upload.extraction_error && (
          <Card className="mb-6 border-amber-200 bg-amber-50/60">
            <CardContent className="flex gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">{upload.extraction_error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Extracted appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Extracted Appointments ({extracted.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {extracted.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {status === "pending"
                    ? "Process this PDF to extract appointments."
                    : "No appointments have been extracted from this upload."}
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {extracted.map((a) => (
                    <Link
                      key={a.id}
                      href={`/admin/appointments/${a.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-secondary/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {a.customer_name ?? "Unnamed appointment"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateOnly(a.appointment_date)} ·{" "}
                          {shortLocation(a.city, a.state)}
                          {a.claim_number ? ` · ${a.claim_number}` : ""}
                        </p>
                        {a.missing_fields.length > 0 && (
                          <p className="mt-0.5 text-xs text-amber-700">
                            Missing/uncertain: {a.missing_fields.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <AppointmentStatusBadge status={a.status} size="sm" />
                        {a.extraction_confidence !== null && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(a.extraction_confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw extracted text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              {upload.raw_extracted_text ? (
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-3 text-xs leading-relaxed">
                  {upload.raw_extracted_text}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Text will appear here after processing.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
