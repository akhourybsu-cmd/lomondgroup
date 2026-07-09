"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveReport, type SaveReportResult } from "@/app/actions/saveReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportEditorProps {
  jobId: string;
  /** Existing report ID — present when editing a saved draft */
  reportId?: string | null;
  initialValues?: {
    title: string;
    condition_summary: string | null;
    condition_details: string | null;
    /** Stored in DB as cents; editor shows dollars */
    valuation_conclusion_cents: number | null;
    valuation_method: string | null;
    valuation_notes: string | null;
  } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportEditor({
  jobId,
  reportId,
  initialValues,
}: ReportEditorProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [result, dispatch, isPending] = useActionState<
    SaveReportResult | null,
    FormData
  >(saveReport, null);

  // Show success flash — no reset since the report persists
  useEffect(() => {
    if (result?.success) {
      // nothing to reset; the form keeps the values
    }
  }, [result]);

  const valuationDollars =
    initialValues?.valuation_conclusion_cents != null
      ? (initialValues.valuation_conclusion_cents / 100).toFixed(2)
      : "";

  return (
    <form ref={formRef} action={dispatch} className="space-y-5">
      {/* Hidden job/report IDs */}
      <input type="hidden" name="job_id" value={jobId} />
      {reportId && <input type="hidden" name="report_id" value={reportId} />}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="report-title">
          Report Title <span className="text-destructive">*</span>
        </Label>
        <input
          id="report-title"
          name="title"
          type="text"
          required
          defaultValue={initialValues?.title ?? ""}
          placeholder={`Vehicle Appraisal Report — ${new Date().getFullYear()}`}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Condition summary */}
      <div className="space-y-1.5">
        <Label htmlFor="condition-summary">Condition Summary</Label>
        <textarea
          id="condition-summary"
          name="condition_summary"
          rows={3}
          defaultValue={initialValues?.condition_summary ?? ""}
          placeholder="Brief overall condition — e.g. &quot;Good mechanical condition with minor cosmetic wear.&quot;"
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Condition details */}
      <div className="space-y-1.5">
        <Label htmlFor="condition-details">Detailed Assessment</Label>
        <textarea
          id="condition-details"
          name="condition_details"
          rows={6}
          defaultValue={initialValues?.condition_details ?? ""}
          placeholder="Full condition narrative: exterior, interior, mechanical, damage history, etc."
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Valuation section */}
      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Valuation
        </p>

        {/* Concluded value */}
        <div className="space-y-1.5">
          <Label htmlFor="valuation-dollars">Appraised Value (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <input
              id="valuation-dollars"
              name="valuation_conclusion_dollars"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valuationDollars}
              placeholder="0.00"
              className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Valuation method */}
        <div className="space-y-1.5">
          <Label htmlFor="valuation-method">Valuation Method</Label>
          <input
            id="valuation-method"
            name="valuation_method"
            type="text"
            defaultValue={initialValues?.valuation_method ?? ""}
            placeholder="e.g. Market comparison, cost approach, income approach"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>

        {/* Valuation notes */}
        <div className="space-y-1.5">
          <Label htmlFor="valuation-notes">Valuation Notes</Label>
          <textarea
            id="valuation-notes"
            name="valuation_notes"
            rows={3}
            defaultValue={initialValues?.valuation_notes ?? ""}
            placeholder="Additional context, limiting conditions, or qualifications…"
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Feedback */}
      {result?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Draft saved.
        </div>
      )}
      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save Draft"
        )}
      </Button>
    </form>
  );
}
