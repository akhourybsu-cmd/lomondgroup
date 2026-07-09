import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Car,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe";
import {
  type JobStatus,
  type AppraisalType,
  APPRAISAL_TYPE_LABELS,
} from "@/lib/types";
import { PortalPayButton } from "@/components/portal/PortalPayButton";

// ── UUID guard ────────────────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Client-safe status labels ─────────────────────────────────────────────────

const CLIENT_STATUS: Record<
  JobStatus,
  { label: string; description: string; color: string }
> = {
  new_request: {
    label: "Received",
    description:
      "We've received your request and will be in touch shortly to confirm details.",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  contacted: {
    label: "In Review",
    description: "We're reviewing your information and preparing next steps.",
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  documents_needed: {
    label: "Documents Needed",
    description:
      "Additional documents are required. Please check any messages from our team.",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  inspection_scheduled: {
    label: "Inspection Scheduled",
    description: "Your vehicle inspection has been confirmed.",
    color: "text-orange-700 bg-orange-50 border-orange-200",
  },
  in_progress: {
    label: "In Progress",
    description: "Your appraisal is actively being prepared by our team.",
    color: "text-sky-700 bg-sky-50 border-sky-200",
  },
  report_drafted: {
    label: "Under Internal Review",
    description: "Your appraisal report is being reviewed before delivery.",
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
  sent_to_client: {
    label: "Report Delivered",
    description: "Your report is complete. Download it below.",
    color: "text-teal-700 bg-teal-50 border-teal-200",
  },
  paid_closed: {
    label: "Closed",
    description: "Your appraisal is complete and payment has been received.",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  on_hold: {
    label: "On Hold",
    description:
      "Your appraisal is temporarily on hold. Our team will be in touch.",
    color: "text-yellow-700 bg-yellow-50 border-yellow-200",
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    description: "Your report is ready. Please complete payment to receive it.",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  canceled: {
    label: "Canceled",
    description: "This appraisal request has been canceled.",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  declined: {
    label: "Declined",
    description:
      "We're unable to fulfill this request. Please contact us for details.",
    color: "text-gray-600 bg-gray-100 border-gray-300",
  },
  needs_owner_review: {
    label: "Under Review",
    description: "Your appraisal requires additional internal review.",
    color: "text-red-700 bg-red-50 border-red-200",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
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

function fmtMileage(m: number | null | undefined): string {
  if (m == null) return null as unknown as string;
  return m.toLocaleString("en-US") + " mi";
}

// ── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  if (!UUID_REGEX.test(token)) {
    return { title: "Not Found — Lomond Appraisal Group" };
  }
  return { title: "Appraisal Portal — Lomond Appraisal Group" };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PortalPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const { payment: paymentResult } = await searchParams;

  // Validate token format before hitting the DB
  if (!UUID_REGEX.test(token)) {
    notFound();
  }

  // ── Dev mode: no Supabase ──────────────────────────────────────────────────
  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-500">
          Connect Supabase to access the client portal.
        </p>
      </div>
    );
  }

  // ── Fetch job by portal token (service client — token IS the credential) ────
  const service = await createServiceClient();

  const { data: job } = await service
    .from("appraisal_jobs")
    .select(
      `
      id, internal_ref, appraisal_type, status, created_at, portal_token,
      vehicle:vehicles(year, make, model, trim, vin, mileage, location_city, location_state),
      client:clients(first_name, last_name),
      appraisal_reports(id, title, is_draft, finalized_at, pdf_storage_path),
      job_notes(id, body, visibility, created_at),
      payments(status, amount_cents, paid_at, method)
    `
    )
    .eq("portal_token", token)
    .single();

  if (!job) {
    notFound();
  }

  // ── Resolve joined relations ───────────────────────────────────────────────
  const vehicle = Array.isArray(job.vehicle)
    ? (job.vehicle[0] as {
        year: number;
        make: string;
        model: string;
        trim: string | null;
        vin: string | null;
        mileage: number | null;
        location_city: string | null;
        location_state: string | null;
      } | undefined)
    : (job.vehicle as {
        year: number;
        make: string;
        model: string;
        trim: string | null;
        vin: string | null;
        mileage: number | null;
        location_city: string | null;
        location_state: string | null;
      } | null);

  const client = Array.isArray(job.client)
    ? (job.client[0] as { first_name: string; last_name: string } | undefined)
    : (job.client as { first_name: string; last_name: string } | null);

  const report = Array.isArray(job.appraisal_reports)
    ? (job.appraisal_reports[0] as {
        id: string;
        title: string;
        is_draft: boolean;
        finalized_at: string | null;
        pdf_storage_path: string | null;
      } | undefined)
    : null;

  const payment = Array.isArray(job.payments)
    ? (job.payments[0] as {
        status: string;
        amount_cents: number | null;
        paid_at: string | null;
        method: string | null;
      } | undefined)
    : null;

  // Client-visible notes only — NEVER show internal notes
  const clientNotes = (
    Array.isArray(job.job_notes) ? job.job_notes : []
  ).filter(
    (n: { visibility: string; id: string; body: string; created_at: string }) =>
      n.visibility === "client_visible"
  ) as Array<{ id: string; body: string; created_at: string }>;

  // ── Generate PDF signed URL (server-side only) ─────────────────────────────
  let pdfUrl: string | null = null;
  if (report && !report.is_draft && report.pdf_storage_path) {
    const { data } = await service.storage
      .from("appraisal-reports")
      .createSignedUrl(report.pdf_storage_path, 3600); // 1-hour TTL
    pdfUrl = data?.signedUrl ?? null;
  }

  const statusCfg =
    CLIENT_STATUS[job.status as JobStatus] ?? CLIENT_STATUS.in_progress;
  const stripeEnabled = isStripeConfigured();
  const isPaid =
    payment?.status === "paid" || payment?.status === "waived";
  const amountCents = payment?.amount_cents ?? null;
  const amountDisplay = fmtCurrency(amountCents);

  return (
    <div className="space-y-6">
      {/* Stripe redirect feedback */}
      {paymentResult === "success" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Payment received — thank you!
            </p>
            <p className="text-sm text-green-700">
              Your payment is processing. This page will update shortly.
            </p>
          </div>
        </div>
      )}
      {paymentResult === "cancelled" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Payment was cancelled. You can try again below when you&apos;re
            ready.
          </p>
        </div>
      )}

      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Your Appraisal
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#1B3A5C]">
          {client
            ? `Welcome, ${client.first_name}`
            : "Your Appraisal Portal"}
        </h1>
        {job.internal_ref && (
          <p className="mt-0.5 font-mono text-sm text-gray-400">
            Reference: {job.internal_ref}
          </p>
        )}
      </div>

      {/* Status card */}
      <div
        className={`rounded-xl border p-5 ${statusCfg.color}`}
      >
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{statusCfg.label}</p>
            <p className="mt-0.5 text-sm opacity-90">{statusCfg.description}</p>
          </div>
        </div>
      </div>

      {/* Vehicle + job info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Car className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Your Vehicle</h2>
        </div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {vehicle && (
            <>
              <div className="text-sm">
                <span className="text-gray-500">Year / Make / Model</span>
                <p className="mt-0.5 font-medium text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.trim ? ` ${vehicle.trim}` : ""}
                </p>
              </div>
              {vehicle.vin && (
                <div className="text-sm">
                  <span className="text-gray-500">VIN</span>
                  <p className="mt-0.5 font-mono text-xs text-gray-700">
                    {vehicle.vin}
                  </p>
                </div>
              )}
              {vehicle.mileage != null && (
                <div className="text-sm">
                  <span className="text-gray-500">Mileage</span>
                  <p className="mt-0.5 text-gray-900">
                    {fmtMileage(vehicle.mileage)}
                  </p>
                </div>
              )}
              {(vehicle.location_city || vehicle.location_state) && (
                <div className="text-sm">
                  <span className="text-gray-500">Location</span>
                  <p className="mt-0.5 text-gray-900">
                    {[vehicle.location_city, vehicle.location_state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </>
          )}
          <div className="text-sm">
            <span className="text-gray-500">Appraisal Type</span>
            <p className="mt-0.5 text-gray-900">
              {APPRAISAL_TYPE_LABELS[job.appraisal_type as AppraisalType] ??
                job.appraisal_type}
            </p>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Request Date</span>
            <p className="mt-0.5 text-gray-900">{fmtDate(job.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Report card — only shown if finalized */}
      {report && !report.is_draft && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1B3A5C]/10">
                <FileText className="h-5 w-5 text-[#1B3A5C]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Appraisal Report
                </h2>
                <p className="text-xs text-gray-500">
                  {report.title}
                  {report.finalized_at &&
                    ` · Finalized ${fmtDate(report.finalized_at)}`}
                </p>
              </div>
            </div>
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#1B3A5C] px-4 py-2 text-sm font-medium text-[#1B3A5C] transition-colors hover:bg-[#1B3A5C] hover:text-white"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            ) : (
              <span className="text-sm text-gray-400">PDF not available</span>
            )}
          </div>
        </div>
      )}

      {/* Payment card */}
      {(payment || amountCents) && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
          </div>

          {isPaid ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  Paid{" "}
                  {payment?.amount_cents
                    ? fmtCurrency(payment.amount_cents)
                    : ""}
                </p>
                {payment?.paid_at && (
                  <p className="text-sm text-gray-500">
                    {fmtDate(payment.paid_at)}
                    {payment.method && ` via ${payment.method}`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1B3A5C]">
                  {amountDisplay}
                </p>
                <p className="text-sm text-gray-500">
                  {payment?.status === "invoiced"
                    ? "Invoice sent — payment pending"
                    : "Amount due"}
                </p>
              </div>
              {stripeEnabled && amountCents && amountCents > 0 ? (
                <PortalPayButton
                  portalToken={token}
                  amountDisplay={amountDisplay}
                />
              ) : (
                <p className="text-sm text-gray-500">
                  Contact us to arrange payment.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Client-visible notes */}
      {clientNotes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Messages from Your Appraiser
            </h2>
          </div>
          <ol className="space-y-4">
            {clientNotes.map((note) => (
              <li key={note.id} className="border-l-2 border-[#C9A84C] pl-4">
                <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {note.body}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {fmtDate(note.created_at)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Need help */}
      <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-500">
          Questions about your appraisal?{" "}
          <a
            href="mailto:info@lomondappraisal.com"
            className="font-medium text-[#1B3A5C] hover:underline"
          >
            Contact our team
          </a>
        </p>
      </div>
    </div>
  );
}
