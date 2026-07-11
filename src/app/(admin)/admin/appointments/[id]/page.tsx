import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentStatusBadge } from "@/components/ops/AppointmentStatusBadge";
import { AppointmentStatusActions } from "@/components/ops/AppointmentStatusActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  type Appointment,
  CONFIRMATION_STATUS_LABELS,
  GEOCODING_STATUS_CONFIG,
} from "@/lib/types";
import { getRoutabilityIssues } from "@/lib/ops/appointments/validation";
import { findPossibleDuplicates } from "@/lib/ops/appointments/duplicates";
import { GeocodeButton } from "@/components/ops/GeocodeButton";
import { AssignToDayControl } from "@/components/ops/AssignToDayControl";
import { ROUTABLE_STATUSES } from "@/lib/types";
import {
  formatDateOnly,
  formatTimeOnly,
  formatTimeWindow,
  fullAddress,
} from "@/lib/ops/format";
import {
  AlertTriangle,
  CalendarClock,
  Car,
  CheckCircle2,
  FileText,
  MapPin,
  Pencil,
  User,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return { title: "Appointment — Lomond Appraisal Admin" };
}

export default async function AppointmentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, contractor:contractors(id, name)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const appt = data as unknown as Appointment & {
    contractor: { id: string; name: string } | null;
  };

  const duplicateSignals =
    appt.status === "duplicate"
      ? []
      : await findPossibleDuplicates(supabase, appt, appt.id);
  const duplicateDetails =
    duplicateSignals.length > 0
      ? (
          await supabase
            .from("appointments")
            .select("id, customer_name, appointment_date, status")
            .in(
              "id",
              duplicateSignals.map((d) => d.appointmentId)
            )
        ).data ?? []
      : [];

  const issues = getRoutabilityIssues(appt);
  const isScheduled = ROUTABLE_STATUSES.includes(appt.status);
  const onRoute = ["routed", "booked", "in_progress"].includes(appt.status);
  const isClosed = ["cancelled", "duplicate", "completed"].includes(appt.status);
  const addressDisplay = fullAddress(appt);
  const geocodingConfig = GEOCODING_STATUS_CONFIG[appt.geocoding_status];
  const vehicleDisplay =
    [appt.vehicle_year, appt.vehicle_make, appt.vehicle_model]
      .filter(Boolean)
      .join(" ") || null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Appointments", href: "/admin/appointments" },
          { label: appt.customer_name ?? "Appointment" },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                {appt.customer_name ?? "Unnamed Appointment"}
              </h1>
              <AppointmentStatusBadge status={appt.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateOnly(appt.appointment_date)}
              {appt.appointment_time &&
                ` at ${formatTimeOnly(appt.appointment_time)}`}
              {appt.contractor && (
                <>
                  {" · "}
                  <Link
                    href={`/admin/contractors/${appt.contractor.id}`}
                    className="hover:underline"
                  >
                    {appt.contractor.name}
                  </Link>
                </>
              )}
            </p>
          </div>
          <Button
            render={<Link href={`/admin/appointments/${appt.id}/edit`} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Assign to Day — the route-first scheduling step */}
        {!isClosed && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                {onRoute
                  ? "Scheduled"
                  : isScheduled
                    ? "Scheduled — ready to route"
                    : "Assign to a Day"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isScheduled && (
                <p className="text-sm text-muted-foreground">
                  Pick the day you plan to visit. The address is verified now so the
                  route optimizer can include it — you&apos;ll book the time with the
                  customer after the route is built.
                </p>
              )}
              <AssignToDayControl
                appointmentId={appt.id}
                currentDate={appt.appointment_date}
                isScheduled={isScheduled}
                onRoute={onRoute}
              />
              {issues.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Not ready to route
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-amber-700">
                    {issues.map((issue) => (
                      <li key={issue.key}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Ready to route on {formatDateOnly(appt.appointment_date)}.
                  {!onRoute && (
                    <Link
                      href={`/admin/routes/${appt.appointment_date}`}
                      className="text-brand-navy underline"
                    >
                      Build/open the route →
                    </Link>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Possible duplicates */}
        {duplicateDetails.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50/60">
            <CardContent className="flex gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Possible duplicate</p>
                <ul className="mt-1 space-y-0.5 text-amber-700">
                  {duplicateDetails.map((d) => {
                    const signal = duplicateSignals.find(
                      (s) => s.appointmentId === d.id
                    );
                    return (
                      <li key={d.id}>
                        <Link
                          href={`/admin/appointments/${d.id}`}
                          className="font-medium underline"
                        >
                          {d.customer_name ?? "Unnamed"} —{" "}
                          {formatDateOnly(d.appointment_date)}
                        </Link>
                        {signal ? ` (${signal.reason})` : ""}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-1 text-xs text-amber-700">
                  If this is a duplicate, use “Mark as Duplicate” below — nothing is
                  deleted automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status actions */}
        <div className="mb-6">
          <AppointmentStatusActions
            appointmentId={appt.id}
            currentStatus={appt.status}
          />
        </div>

        {/* Detail cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <InfoRow
                  label="Date"
                  value={formatDateOnly(appt.appointment_date)}
                />
                <InfoRow
                  label="Time"
                  value={
                    appt.appointment_time
                      ? formatTimeOnly(appt.appointment_time)
                      : null
                  }
                />
                <InfoRow
                  label="Time window"
                  value={formatTimeWindow(
                    appt.time_window_start,
                    appt.time_window_end
                  )}
                />
                <InfoRow
                  label="Est. duration"
                  value={`${appt.estimated_duration_minutes} min`}
                />
                <InfoRow
                  label="Confirmation"
                  value={CONFIRMATION_STATUS_LABELS[appt.confirmation_status]}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <InfoRow label="Address" value={addressDisplay} />
                <InfoRow
                  label="Address status"
                  value={
                    <span className={geocodingConfig.color}>
                      {geocodingConfig.label}
                    </span>
                  }
                />
                {appt.formatted_address && (
                  <InfoRow label="Verified as" value={appt.formatted_address} />
                )}
                <InfoRow
                  label="Vehicle location"
                  value={appt.vehicle_location_notes}
                />
              </dl>
              {appt.geocoding_status !== "success" && addressDisplay && (
                <div className="mt-3">
                  <GeocodeButton appointmentId={appt.id} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <InfoRow label="Name" value={appt.customer_name} />
                <InfoRow
                  label="Phone"
                  value={
                    appt.customer_phone ? (
                      <a
                        href={`tel:${appt.customer_phone}`}
                        className="text-brand-navy hover:underline"
                      >
                        {appt.customer_phone}
                      </a>
                    ) : null
                  }
                />
                <InfoRow
                  label="Email"
                  value={
                    appt.customer_email ? (
                      <a
                        href={`mailto:${appt.customer_email}`}
                        className="text-brand-navy hover:underline"
                      >
                        {appt.customer_email}
                      </a>
                    ) : null
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <InfoRow
                  label="Contractor"
                  value={
                    appt.contractor ? (
                      <Link
                        href={`/admin/contractors/${appt.contractor.id}`}
                        className="text-brand-navy hover:underline"
                      >
                        {appt.contractor.name}
                      </Link>
                    ) : null
                  }
                />
                <InfoRow
                  label="Claim #"
                  value={
                    appt.claim_number ? (
                      <span className="font-mono text-xs">{appt.claim_number}</span>
                    ) : null
                  }
                />
                <InfoRow
                  label="Reference #"
                  value={
                    appt.reference_number ? (
                      <span className="font-mono text-xs">
                        {appt.reference_number}
                      </span>
                    ) : null
                  }
                />
                <InfoRow label="Insurance" value={appt.insurance_company} />
                <InfoRow
                  label="Source"
                  value={
                    appt.source_type === "manual" ? (
                      "Entered manually"
                    ) : appt.pdf_upload_id ? (
                      <Link
                        href={`/admin/uploads/${appt.pdf_upload_id}`}
                        className="text-brand-navy hover:underline"
                      >
                        Extracted from PDF — view original
                      </Link>
                    ) : (
                      "Extracted from PDF"
                    )
                  }
                />
                {appt.source_type === "pdf_extraction" && (
                  <>
                    <InfoRow
                      label="Extraction confidence"
                      value={
                        appt.extraction_confidence !== null
                          ? `${Math.round(appt.extraction_confidence * 100)}%`
                          : null
                      }
                    />
                    <InfoRow
                      label="Uncertain fields"
                      value={
                        appt.missing_fields.length > 0 ? (
                          <span className="text-amber-700">
                            {appt.missing_fields.join(", ")}
                          </span>
                        ) : (
                          "None flagged"
                        )
                      }
                    />
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4 text-muted-foreground" />
                Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <InfoRow label="Vehicle" value={vehicleDisplay} />
                <InfoRow
                  label="VIN"
                  value={
                    appt.vin ? (
                      <span className="font-mono text-xs">{appt.vin}</span>
                    ) : null
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Damage / appraisal notes
                </p>
                <p className="whitespace-pre-wrap">
                  {appt.damage_notes ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Special instructions
                </p>
                <p className="whitespace-pre-wrap">
                  {appt.special_instructions ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">
                  Internal notes
                </p>
                <p className="whitespace-pre-wrap">
                  {appt.internal_notes ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer meta */}
        <p className="mt-6 text-xs text-muted-foreground">
          Created {formatTimestamp(appt.created_at)} · Last updated{" "}
          {formatTimestamp(appt.updated_at)}
        </p>
      </div>
    </div>
  );
}
