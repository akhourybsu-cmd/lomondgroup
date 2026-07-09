/**
 * Server Component — orchestrates the full Report tab for a job.
 *
 * Security:
 *  - pdf_storage_path is fetched via service client and NEVER passed to the
 *    browser. Only a short-lived signed URL is generated and sent instead.
 *  - All report data reads use the service client; write access is enforced
 *    in the server actions (RLS + role checks).
 */

import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportEditor } from "./ReportEditor";
import { FinalizeReportButton } from "./FinalizeReportButton";
import { ComparableForm } from "./ComparableForm";
import { ComparablesList } from "./ComparablesList";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportPanelProps {
  jobId: string;
}

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

function fmtCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function ReportPanel({ jobId }: ReportPanelProps) {
  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Connect Supabase to view the report builder.
          </p>
        </CardContent>
      </Card>
    );
  }

  const service = await createServiceClient();

  // Fetch existing report (includes pdf_storage_path — server-only)
  const { data: report } = await service
    .from("appraisal_reports")
    .select(
      `
      id, title, condition_summary, condition_details,
      valuation_conclusion_cents, valuation_method, valuation_notes,
      is_draft, finalized_at, pdf_storage_path
    `
    )
    .eq("job_id", jobId)
    .single();

  // Generate signed URL for the PDF if finalized (server-only — path never sent to browser)
  let pdfSignedUrl: string | null = null;
  if (report?.pdf_storage_path) {
    const { data: urlData } = await service.storage
      .from("appraisal-reports")
      .createSignedUrl(report.pdf_storage_path, 3600); // 1-hour TTL
    pdfSignedUrl = urlData?.signedUrl ?? null;
  }

  // ── Finalized state ──────────────────────────────────────────────────────────

  if (report && !report.is_draft) {
    return (
      <div className="space-y-6">
        {/* Finalized banner */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-700" />
              <div>
                <p className="font-semibold text-green-800">Report Finalized</p>
                {report.finalized_at && (
                  <p className="mt-0.5 text-sm text-green-700">
                    <Clock className="mr-1 inline h-3.5 w-3.5" />
                    {formatDate(report.finalized_at)}
                  </p>
                )}
              </div>
            </div>
            {pdfSignedUrl ? (
              <a
                href={pdfSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            ) : (
              <p className="text-sm text-green-700">PDF not available</p>
            )}
          </CardContent>
        </Card>

        {/* Report summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {report.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.condition_summary && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Condition Summary
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {report.condition_summary}
                </p>
              </div>
            )}
            {report.condition_details && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detailed Assessment
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                  {report.condition_details}
                </p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Appraised Value
              </p>
              <p className="text-2xl font-bold text-brand-navy">
                {fmtCurrency(report.valuation_conclusion_cents)}
              </p>
              {report.valuation_method && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Method: {report.valuation_method}
                </p>
              )}
              {report.valuation_notes && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {report.valuation_notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparables (read-only) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Market Comparables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComparablesList reportId={report.id} isFinalized={true} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Draft / no-report state ──────────────────────────────────────────────────

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column (editor + comparables) */}
      <div className="space-y-6 lg:col-span-2">
        {/* Report editor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {report ? "Edit Draft Report" : "New Report"}
              {report && (
                <span className="ml-2 inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                  Draft
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportEditor
              jobId={jobId}
              reportId={report?.id ?? null}
              initialValues={
                report
                  ? {
                      title: report.title,
                      condition_summary: report.condition_summary,
                      condition_details: report.condition_details,
                      valuation_conclusion_cents:
                        report.valuation_conclusion_cents,
                      valuation_method: report.valuation_method,
                      valuation_notes: report.valuation_notes,
                    }
                  : null
              }
            />
          </CardContent>
        </Card>

        {/* Comparables table — only shown once a report exists */}
        {report && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Market Comparables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ComparablesList reportId={report.id} isFinalized={false} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right column (actions) */}
      <div className="space-y-6">
        {report ? (
          <>
            {/* Finalize card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  Finalize Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Finalization locks the report, generates a PDF, and stores it
                  securely. This action cannot be undone.
                </p>
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Save your draft and add all comparables before finalizing.
                  </span>
                </div>
                <FinalizeReportButton reportId={report.id} />
              </CardContent>
            </Card>

            {/* Add comparable form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Add Comparable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComparableForm reportId={report.id} />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Save a draft report first to unlock the comparables section and
                the finalization option.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
