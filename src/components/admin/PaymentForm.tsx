"use client";

import { useActionState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updatePayment,
  type UpdatePaymentResult,
} from "@/app/actions/updatePayment";
import type { PaymentStatus } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentFormProps {
  jobId: string;
  initialStatus?: PaymentStatus;
  /** Stored as cents in DB; form shows dollars */
  initialAmountCents?: number | null;
  initialMethod?: string | null;
  initialNotes?: string | null;
}

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "invoiced", label: "Invoiced" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];

const METHOD_OPTIONS = [
  { value: "", label: "— Not specified —" },
  { value: "stripe", label: "Stripe (card)" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "waived", label: "Waived (no charge)" },
  { value: "other", label: "Other" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentForm({
  jobId,
  initialStatus = "unpaid",
  initialAmountCents,
  initialMethod,
  initialNotes,
}: PaymentFormProps) {
  const [result, dispatch, isPending] = useActionState<
    UpdatePaymentResult | null,
    FormData
  >(updatePayment, null);

  const initialDollars =
    initialAmountCents != null
      ? (initialAmountCents / 100).toFixed(2)
      : "";

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="job_id" value={jobId} />

      {/* Status */}
      <div className="space-y-1.5">
        <Label htmlFor="payment-status">Status</Label>
        <select
          id="payment-status"
          name="status"
          defaultValue={initialStatus}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="payment-amount">Amount (USD)</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <input
            id="payment-amount"
            name="amount_dollars"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initialDollars}
            placeholder="0.00"
            className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Method */}
      <div className="space-y-1.5">
        <Label htmlFor="payment-method">Payment Method</Label>
        <select
          id="payment-method"
          name="method"
          defaultValue={initialMethod ?? ""}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        >
          {METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="payment-notes">Notes</Label>
        <textarea
          id="payment-notes"
          name="notes"
          rows={2}
          defaultValue={initialNotes ?? ""}
          placeholder="Check number, transaction ID, or other notes…"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Feedback */}
      {result?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment record updated.
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
          "Save Payment Record"
        )}
      </Button>
    </form>
  );
}
