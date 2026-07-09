import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { JobStatusBadge } from "@/components/admin/JobStatusBadge";
import { StatusUpdateForm } from "@/components/admin/StatusUpdateForm";
import { FileList } from "@/components/admin/FileList";
import { FileUploadForm } from "@/components/admin/FileUploadForm";
import { NoteList } from "@/components/admin/NoteList";
import { AddNoteForm } from "@/components/admin/AddNoteForm";
import { ReportPanel } from "@/components/admin/ReportPanel";
import { PaymentPanel } from "@/components/admin/PaymentPanel";
import { PortalLinkCard } from "@/components/admin/PortalLinkCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  type JobStatus,
  type AppraisalType,
  type AuditEventType,
  APPRAISAL_TYPE_LABELS,
} from "@/lib/types";
import {
  User,
  Car,
  FileText,
  Shield,
  MessageSquare,
  Clock,
} from "lucide-react";

// ── Local types ───────────────────────────────────────────────────────────────

type JobDetail = {
  id: string;
  appraisal_type: AppraisalType;
  status: JobStatus;
  priority: "normal" | "high" | "urgent";
  internal_ref: string | null;
  insurance_company: string | null;
  claim_number: string | null;
  date_of_loss: string | null;
  vehicle_repaired: boolean | null;
  has_repair_estimate: boolean | null;
  has_settlement_offer: boolean | null;
  customer_notes: string | null;
  quoted_fee_cents: number | null;
  portal_token: string;
  created_at: string;
  updated_at: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    preferred_contact: string;
  } | null;
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    vin: string | null;
    mileage: number | null;
    color: string | null;
    location_city: string | null;
    location_state: string | null;
    is_drivable: boolean | null;
  } | null;
  audit_logs: {
    id: string;
    actor_id: string | null;
    event_type: AuditEventType;
    metadata: Record<string, unknown>;
    ip_address: string | null;
    created_at: string;
  }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime && { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(iso));
}

function BoolLabel({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={value ? "text-green-700" : "text-muted-foreground"}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

const AUDIT_EVENT_LABELS: Partial<Record<AuditEventType, string>> = {
  job_created: "Job created",
  job_status_changed: "Status changed",
  job_assigned: "Appraiser assigned",
  file_uploaded: "File uploaded",
  file_viewed: "File viewed",
  file_downloaded: "File downloaded",
  note_added: "Note added",
  report_generated: "Report generated",
  report_finalized: "Report finalized",
  report_sent: "Report sent",
  payment_updated: "Payment updated",
  user_role_changed: "Role changed",
  failed_access_attempt: "Failed access attempt",
  client_portal_access: "Client portal accessed",
};

// ── Metadata ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Job ${id.slice(0, 8).toUpperCase()} — Lomond Appraisal Admin`,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let job: JobDetail | null = null;

  if (isConfigured) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("appraisal_jobs")
      .select(
        `
        id, appraisal_type, status, priority, internal_ref,
        insurance_company, claim_number, date_of_loss,
        vehicle_repaired, has_repair_estimate, has_settlement_offer,
        customer_notes, quoted_fee_cents, portal_token,
        created_at, updated_at,
        client:clients(
          id, first_name, last_name, email, phone, preferred_contact
        ),
        vehicle:vehicles(
          id, year, make, model, trim, vin, mileage, color,
          location_city, location_state, is_drivable
        ),
        audit_logs(
          id, actor_id, event_type, metadata, ip_address, created_at
        )
      `
      )
      .eq("id", id)
      .order("created_at", { referencedTable: "audit_logs", ascending: false })
      .single();

    if (error || !data) {
      notFound();
    }

    job = data as unknown as JobDetail;
  }

  const ref = job?.internal_ref ?? id.slice(0, 8).toUpperCase();
  const displayTitle = job ? `Job ${ref}` : `Job ${id.slice(0, 8).toUpperCase()}`;

  const hasClaimInfo =
    job &&
    (job.appraisal_type === "diminished_value" ||
      job.appraisal_type === "total_loss_dispute");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Jobs", href: "/admin/jobs" },
          { label: displayTitle },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight font-mono">
                {displayTitle}
              </h1>
              {job && <JobStatusBadge status={job.status} />}
              {job && job.priority !== "normal" && (
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${
                    job.priority === "urgent"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {job.priority}
                </span>
              )}
            </div>
            {job && (
              <p className="mt-1 text-sm text-muted-foreground">
                {APPRAISAL_TYPE_LABELS[job.appraisal_type]} ·{" "}
                Created {formatDate(job.created_at)}
              </p>
            )}
          </div>
        </div>

        {!isConfigured ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Connect Supabase to view job details.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="mb-6 h-auto flex-wrap gap-0.5 bg-secondary p-1">
              {[
                "Overview",
                "Files",
                "Notes",
                "Report",
                "Payment",
                "Audit",
              ].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase()}
                  className="text-xs sm:text-sm"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Overview ───────────────────────────────────────────────── */}
            <TabsContent value="overview">
              {job ? (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Left column */}
                  <div className="space-y-6 lg:col-span-2">
                    {/* Client info */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Client
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {job.client ? (
                          <dl className="divide-y divide-border">
                            <InfoRow
                              label="Name"
                              value={`${job.client.first_name} ${job.client.last_name}`}
                            />
                            <InfoRow
                              label="Email"
                              value={
                                <a
                                  href={`mailto:${job.client.email}`}
                                  className="text-brand-navy hover:underline"
                                >
                                  {job.client.email}
                                </a>
                              }
                            />
                            <InfoRow
                              label="Phone"
                              value={
                                job.client.phone ? (
                                  <a
                                    href={`tel:${job.client.phone}`}
                                    className="text-brand-navy hover:underline"
                                  >
                                    {job.client.phone}
                                  </a>
                                ) : null
                              }
                            />
                            <InfoRow
                              label="Preferred contact"
                              value={
                                <span className="capitalize">
                                  {job.client.preferred_contact}
                                </span>
                              }
                            />
                          </dl>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No client data
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Vehicle info */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          Vehicle
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {job.vehicle ? (
                          <dl className="divide-y divide-border">
                            <InfoRow
                              label="Year / Make / Model"
                              value={`${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}`}
                            />
                            {job.vehicle.trim && (
                              <InfoRow label="Trim" value={job.vehicle.trim} />
                            )}
                            <InfoRow label="VIN" value={job.vehicle.vin} />
                            <InfoRow
                              label="Mileage"
                              value={
                                job.vehicle.mileage != null
                                  ? job.vehicle.mileage.toLocaleString()
                                  : null
                              }
                            />
                            <InfoRow
                              label="Color"
                              value={job.vehicle.color}
                            />
                            <InfoRow
                              label="Location"
                              value={
                                job.vehicle.location_city &&
                                job.vehicle.location_state
                                  ? `${job.vehicle.location_city}, ${job.vehicle.location_state}`
                                  : job.vehicle.location_city ??
                                    job.vehicle.location_state
                              }
                            />
                            <InfoRow
                              label="Drivable"
                              value={<BoolLabel value={job.vehicle.is_drivable} />}
                            />
                          </dl>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No vehicle data
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Claim / insurance info */}
                    {hasClaimInfo && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            Insurance / Claim
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <dl className="divide-y divide-border">
                            <InfoRow
                              label="Insurance company"
                              value={job.insurance_company}
                            />
                            <InfoRow
                              label="Claim number"
                              value={job.claim_number}
                            />
                            <InfoRow
                              label="Date of loss"
                              value={
                                job.date_of_loss
                                  ? formatDate(job.date_of_loss)
                                  : null
                              }
                            />
                            <InfoRow
                              label="Vehicle repaired"
                              value={<BoolLabel value={job.vehicle_repaired} />}
                            />
                            <InfoRow
                              label="Has repair estimate"
                              value={<BoolLabel value={job.has_repair_estimate} />}
                            />
                            <InfoRow
                              label="Has settlement offer"
                              value={<BoolLabel value={job.has_settlement_offer} />}
                            />
                          </dl>
                        </CardContent>
                      </Card>
                    )}

                    {/* Customer notes */}
                    {job.customer_notes && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            Customer Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-wrap text-sm text-foreground">
                            {job.customer_notes}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right column */}
                  <div className="space-y-6">
                    {/* Job meta + status update */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Job Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <dl className="divide-y divide-border">
                          <InfoRow
                            label="Reference"
                            value={
                              <span className="font-mono text-xs font-medium">
                                {job.internal_ref ?? "—"}
                              </span>
                            }
                          />
                          <InfoRow
                            label="Type"
                            value={APPRAISAL_TYPE_LABELS[job.appraisal_type]}
                          />
                          <InfoRow
                            label="Current status"
                            value={<JobStatusBadge status={job.status} size="sm" />}
                          />
                          <InfoRow
                            label="Priority"
                            value={
                              <span className="capitalize">{job.priority}</span>
                            }
                          />
                          <InfoRow
                            label="Created"
                            value={formatDate(job.created_at, true)}
                          />
                          <InfoRow
                            label="Updated"
                            value={formatDate(job.updated_at, true)}
                          />
                          {job.quoted_fee_cents != null && (
                            <InfoRow
                              label="Quoted fee"
                              value={new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(job.quoted_fee_cents / 100)}
                            />
                          )}
                        </dl>

                        {/* Status update */}
                        <div className="border-t border-border pt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Update Status
                          </p>
                          <StatusUpdateForm
                            jobId={job.id}
                            currentStatus={job.status}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Status history */}
                    {(() => {
                      const statusEvents = job.audit_logs.filter(
                        (e) => e.event_type === "job_status_changed"
                      );
                      if (statusEvents.length === 0) return null;
                      return (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              Status History
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ol className="space-y-0">
                              {statusEvents.map((entry, i) => (
                                <li
                                  key={entry.id}
                                  className="relative flex gap-3 pb-4 last:pb-0"
                                >
                                  {/* Connector line */}
                                  {i < statusEvents.length - 1 && (
                                    <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                                  )}
                                  <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-navy bg-white" />
                                  <div className="min-w-0">
                                    {typeof entry.metadata.from === "string" &&
                                    typeof entry.metadata.to === "string" ? (
                                      <p className="text-xs">
                                        <span className="text-muted-foreground">
                                          {entry.metadata.from}
                                        </span>
                                        {" → "}
                                        <span className="font-medium text-foreground">
                                          {entry.metadata.to}
                                        </span>
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        Status changed
                                      </p>
                                    )}
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {formatDate(entry.created_at, true)}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Client portal link */}
                    <PortalLinkCard
                      jobId={job.id}
                      portalToken={job.portal_token}
                    />
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Job not found.
                    </p>
                    <Link
                      href="/admin/jobs"
                      className="mt-2 inline-block text-sm text-brand-navy hover:underline"
                    >
                      ← Back to Job Board
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Files ─────────────────────────────────────────────────── */}
            <TabsContent value="files">
              {job ? (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* File list */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Uploaded Files
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FileList jobId={job.id} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upload form */}
                  <div>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Upload File
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FileUploadForm jobId={job.id} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Job not found.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <TabsContent value="notes">
              {job ? (
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Note list */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <NoteList jobId={job.id} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Add note form */}
                  <div>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Add Note
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AddNoteForm jobId={job.id} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Job not found.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Report ──────────────────────────────────────────────────── */}
            <TabsContent value="report">
              {job ? (
                <ReportPanel jobId={job.id} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Job not found.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Payment ─────────────────────────────────────────────────── */}
            <TabsContent value="payment">
              {job ? (
                <PaymentPanel
                  jobId={job.id}
                  quotedFeeCents={job.quoted_fee_cents}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Job not found.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Audit log ──────────────────────────────────────────────── */}
            <TabsContent value="audit">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Audit Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!job || job.audit_logs.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No audit events recorded yet.
                      </p>
                    </div>
                  ) : (
                    <ol className="space-y-0 divide-y divide-border">
                      {job.audit_logs.map((entry) => (
                        <li key={entry.id} className="py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {AUDIT_EVENT_LABELS[entry.event_type] ??
                                  entry.event_type}
                              </p>
                              {entry.event_type === "job_status_changed" &&
                                typeof entry.metadata.from === "string" &&
                                typeof entry.metadata.to === "string" && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {entry.metadata.from} →{" "}
                                    {entry.metadata.to}
                                  </p>
                                )}
                              {entry.actor_id && (
                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  Actor: {entry.actor_id.slice(0, 8)}
                                </p>
                              )}
                            </div>
                            <time
                              dateTime={entry.created_at}
                              className="shrink-0 text-xs text-muted-foreground"
                            >
                              {formatDate(entry.created_at, true)}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
