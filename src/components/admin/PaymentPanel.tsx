/**
 * Server Component — orchestrates the Payment tab for a job.
 *
 * Security:
 *  - No sensitive payment data is exposed beyond what the admin needs.
 *  - Stripe checkout URLs are re-generated on demand; old ones are not stored
 *    in the browser — only the session ID is in the DB.
 *  - The Stripe publishable key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) is safe
 *    to expose; the secret key never leaves server context.
 */

import {
  CreditCard,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentForm } from "./PaymentForm";
import { CheckoutLinkGenerator } from "./CheckoutLinkGenerator";
import type { PaymentStatus } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  unpaid: {
    label: "Unpaid",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  },
  invoiced: {
    label: "Invoiced",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  partial: {
    label: "Partial",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  paid: {
    label: "Paid",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  refunded: {
    label: "Refunded",
    className: "border-purple-200 bg-purple-50 text-purple-700",
  },
  waived: {
    label: "Waived",
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
};

function fmtCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  jobId: string;
  /** Fall-back amount from the job's quoted_fee_cents if no payment record exists */
  quotedFeeCents: number | null;
}

export async function PaymentPanel({ jobId, quotedFeeCents }: PaymentPanelProps) {
  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Connect Supabase to manage payments.
          </p>
        </CardContent>
      </Card>
    );
  }

  const service = await createServiceClient();
  const stripeEnabled = isStripeConfigured();

  // Fetch existing payment record
  const { data: payment } = await service
    .from("payments")
    .select(
      "id, status, amount_cents, paid_at, method, notes, stripe_checkout_session_id"
    )
    .eq("job_id", jobId)
    .single();

  const isPaid =
    payment?.status === "paid" || payment?.status === "waived";

  // ── Paid / waived state ──────────────────────────────────────────────────────

  if (isPaid) {
    const cfg = STATUS_CONFIG[payment!.status as PaymentStatus];
    return (
      <div className="space-y-6">
        {/* Paid banner */}
        <Card
          className={`border-2 ${
            payment!.status === "paid"
              ? "border-green-300 bg-green-50"
              : "border-teal-300 bg-teal-50"
          }`}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle2
              className={`h-8 w-8 shrink-0 ${
                payment!.status === "paid"
                  ? "text-green-700"
                  : "text-teal-700"
              }`}
            />
            <div>
              <p
                className={`text-base font-semibold ${
                  payment!.status === "paid"
                    ? "text-green-800"
                    : "text-teal-800"
                }`}
              >
                {cfg.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {fmtCurrency(payment!.amount_cents)}
                {payment!.paid_at &&
                  ` · ${fmtDate(payment!.paid_at)}`}
                {payment!.method && ` · ${payment!.method}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {payment!.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{payment!.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Allow manual correction even after paid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Correct Payment Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Only use this to correct errors. Changing status from &quot;Paid&quot; will
              not issue a refund through Stripe.
            </p>
            <PaymentForm
              jobId={jobId}
              initialStatus={payment!.status as PaymentStatus}
              initialAmountCents={payment!.amount_cents}
              initialMethod={payment!.method}
              initialNotes={payment!.notes}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pending payment state ────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left col — status overview */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <div className="grid grid-cols-2 gap-2 py-2 text-sm">
                <dt className="font-medium text-muted-foreground">Status</dt>
                <dd>
                  {payment ? (
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
                        STATUS_CONFIG[payment.status as PaymentStatus].className
                      }`}
                    >
                      {STATUS_CONFIG[payment.status as PaymentStatus].label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No record</span>
                  )}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-2 py-2 text-sm">
                <dt className="font-medium text-muted-foreground">Amount</dt>
                <dd className="font-semibold">
                  {fmtCurrency(
                    payment?.amount_cents ?? quotedFeeCents
                  )}
                  {!payment?.amount_cents && quotedFeeCents && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (quoted)
                    </span>
                  )}
                </dd>
              </div>
              {payment?.method && (
                <div className="grid grid-cols-2 gap-2 py-2 text-sm">
                  <dt className="font-medium text-muted-foreground">Method</dt>
                  <dd className="capitalize">{payment.method}</dd>
                </div>
              )}
              {payment?.notes && (
                <div className="grid grid-cols-2 gap-2 py-2 text-sm">
                  <dt className="font-medium text-muted-foreground">Notes</dt>
                  <dd className="text-muted-foreground">{payment.notes}</dd>
                </div>
              )}
            </dl>

            {/* Stripe session info */}
            {payment?.stripe_checkout_session_id && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Stripe checkout session active
                  </p>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {payment.stripe_checkout_session_id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right col — actions */}
      <div className="space-y-6">
        {/* Manual update form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              {payment ? "Update Payment" : "Create Record"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm
              jobId={jobId}
              initialStatus={(payment?.status as PaymentStatus) ?? "unpaid"}
              initialAmountCents={payment?.amount_cents ?? quotedFeeCents}
              initialMethod={payment?.method}
              initialNotes={payment?.notes}
            />
          </CardContent>
        </Card>

        {/* Stripe checkout link */}
        {stripeEnabled && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ExternalLinkIcon />
                Stripe Payment Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutLinkGenerator jobId={jobId} />
            </CardContent>
          </Card>
        )}

        {/* Stripe not configured notice */}
        {!stripeEnabled && (
          <Card className="border-dashed">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">
                Stripe not configured
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Add{" "}
                <code className="rounded bg-secondary px-1">
                  STRIPE_SECRET_KEY
                </code>{" "}
                and{" "}
                <code className="rounded bg-secondary px-1">
                  STRIPE_WEBHOOK_SECRET
                </code>{" "}
                to <code className="rounded bg-secondary px-1">.env.local</code>{" "}
                to enable online payment links.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Inline icon component to avoid an extra import
function ExternalLinkIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
