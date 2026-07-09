import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RouteStopControls } from "@/components/ops/RouteStopControls";
import { RecalculateRouteButton } from "@/components/ops/RouteToolbar";
import { InsertionPanel } from "@/components/ops/InsertionPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateOnly,
  formatTimeOnly,
  formatTimeWindow,
  fullAddress,
} from "@/lib/ops/format";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Navigation,
  Route,
  SkipForward,
} from "lucide-react";

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  return { title: `Route ${date} — Lomond Appraisal Admin` };
}

type StopRow = {
  id: string;
  stop_order: number;
  estimated_arrival_time: string | null;
  estimated_departure_time: string | null;
  drive_time_from_previous_minutes: number | null;
  miles_from_previous: number | null;
  locked_position: boolean;
  completed_at: string | null;
  skipped: boolean;
  appointment: {
    id: string;
    customer_name: string | null;
    customer_phone: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    formatted_address: string | null;
    time_window_start: string | null;
    time_window_end: string | null;
    estimated_duration_minutes: number;
    claim_number: string | null;
    special_instructions: string | null;
  };
};

function hoursLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function navUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export default async function RouteDetailPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const { data: routes } = await supabase
    .from("daily_routes")
    .select("*")
    .eq("route_date", date)
    .in("route_status", ["draft", "active", "completed"])
    .order("created_at", { ascending: false })
    .limit(1);
  const route = routes?.[0];

  if (!route) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={[
            { label: "Routes", href: "/admin/routes" },
            { label: formatDateOnly(date) },
          ]}
        />
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Route className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No route for {formatDateOnly(date)} yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Build one from the day&apos;s confirmed appointments.
                </p>
              </div>
              <Button
                render={<Link href={`/admin/routes?date=${date}`} />}
                nativeButton={false}
                className="bg-brand-navy text-white hover:bg-brand-navy-dark"
              >
                Build Route
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [{ data: stopData }, { data: unroutedData }] = await Promise.all([
    supabase
      .from("route_stops")
      .select(
        `id, stop_order, estimated_arrival_time, estimated_departure_time,
         drive_time_from_previous_minutes, miles_from_previous, locked_position,
         completed_at, skipped,
         appointment:appointments(id, customer_name, customer_phone, address_line_1,
         address_line_2, city, state, zip, formatted_address, time_window_start,
         time_window_end, estimated_duration_minutes, claim_number, special_instructions)`
      )
      .eq("daily_route_id", route.id)
      .order("stop_order"),
    supabase
      .from("appointments")
      .select("id, customer_name, city, state, status, geocoding_status")
      .eq("appointment_date", date)
      .eq("status", "confirmed"),
  ]);

  const stops = (stopData ?? []) as unknown as StopRow[];
  const routedIds = new Set(stops.map((s) => s.appointment.id));
  const unrouted = (unroutedData ?? []).filter((a) => !routedIds.has(a.id));

  // Time-window conflict check for display
  const conflicts = stops.filter(
    (s) =>
      !s.skipped &&
      s.estimated_arrival_time &&
      s.appointment.time_window_end &&
      s.estimated_arrival_time.slice(0, 5) > s.appointment.time_window_end.slice(0, 5)
  );

  const workdayMinutes =
    (route.total_drive_time_minutes ?? 0) + (route.total_appointment_time_minutes ?? 0);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Routes", href: "/admin/routes" },
          { label: formatDateOnly(date) },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header + totals */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Route — {formatDateOnly(date)}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Starts {formatTimeOnly(route.day_start_time)} from {route.start_address}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>
                <span className="font-medium">{stops.length}</span> stops
              </span>
              <span>
                <span className="font-medium">{route.total_miles ?? "—"}</span> miles
              </span>
              <span>
                <span className="font-medium">{hoursLabel(route.total_drive_time_minutes)}</span>{" "}
                driving
              </span>
              <span>
                <span className="font-medium">{hoursLabel(workdayMinutes)}</span> workday
              </span>
              <span>
                done by{" "}
                <span className="font-medium">
                  {route.estimated_day_end_time
                    ? formatTimeOnly(route.estimated_day_end_time)
                    : "—"}
                </span>
              </span>
            </div>
          </div>
          <RecalculateRouteButton routeId={route.id} />
        </div>

        {conflicts.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50/60">
            <CardContent className="flex gap-3 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Route Conflict</p>
                <ul className="mt-1 list-inside list-disc">
                  {conflicts.map((s) => (
                    <li key={s.id}>
                      Stop {s.stop_order} ({s.appointment.customer_name ?? "unnamed"}) arrives{" "}
                      {formatTimeOnly(s.estimated_arrival_time)} — after its{" "}
                      {formatTimeOnly(s.appointment.time_window_end)} window end.
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stop list */}
        <div className="space-y-3">
          {stops.map((stop, i) => {
            const address =
              stop.appointment.formatted_address ?? fullAddress(stop.appointment);
            const window = formatTimeWindow(
              stop.appointment.time_window_start,
              stop.appointment.time_window_end
            );
            const completed = stop.completed_at !== null;
            return (
              <Card
                key={stop.id}
                className={
                  completed
                    ? "border-green-200 bg-green-50/40"
                    : stop.skipped
                    ? "opacity-60"
                    : undefined
                }
              >
                <CardContent className="py-4">
                  {/* Leg info */}
                  {!stop.skipped && stop.drive_time_from_previous_minutes !== null && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      <Navigation className="mr-1 inline h-3 w-3" />
                      {stop.drive_time_from_previous_minutes} min ·{" "}
                      {stop.miles_from_previous} mi from{" "}
                      {i === 0 ? "start" : `stop ${i}`}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
                        {stop.stop_order}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/appointments/${stop.appointment.id}`}
                            className="font-medium hover:underline"
                          >
                            {stop.appointment.customer_name ?? "Unnamed appointment"}
                          </Link>
                          {completed && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                            </span>
                          )}
                          {stop.locked_position && !completed && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          )}
                          {stop.skipped && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                              <SkipForward className="h-3.5 w-3.5" /> Skipped
                            </span>
                          )}
                        </div>
                        {address && (
                          <p className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{address}</span>
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {stop.appointment.claim_number
                            ? `Claim ${stop.appointment.claim_number} · `
                            : ""}
                          {stop.appointment.estimated_duration_minutes} min on site
                          {window ? ` · window ${window}` : ""}
                          {stop.appointment.customer_phone
                            ? ` · ${stop.appointment.customer_phone}`
                            : ""}
                        </p>
                        {stop.appointment.special_instructions && (
                          <p className="mt-1 text-xs text-amber-700">
                            {stop.appointment.special_instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                      {!stop.skipped && (
                        <p className="text-sm">
                          <Clock className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {formatTimeOnly(stop.estimated_arrival_time)}
                          </span>{" "}
                          –{" "}
                          <span className="font-medium">
                            {formatTimeOnly(stop.estimated_departure_time)}
                          </span>
                        </p>
                      )}
                      {address && (
                        <a
                          href={navUrl(address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand-navy hover:underline"
                        >
                          Open in Google Maps ↗
                        </a>
                      )}
                      <RouteStopControls
                        stopId={stop.id}
                        locked={stop.locked_position}
                        completed={completed}
                        skipped={stop.skipped}
                        isFirst={i === 0}
                        isLast={i === stops.length - 1}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unrouted appointments for this date */}
        {unrouted.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">
                Confirmed appointments not on this route ({unrouted.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {unrouted.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/admin/appointments/${a.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.customer_name ?? "Unnamed appointment"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {[a.city, a.state].filter(Boolean).join(", ")}
                    </span>
                  </div>
                  {a.geocoding_status === "success" ? (
                    <InsertionPanel
                      routeId={route.id}
                      appointmentId={a.id}
                      appointmentLabel={a.customer_name ?? "this appointment"}
                    />
                  ) : (
                    <p className="text-xs text-amber-700">
                      Verify this appointment&apos;s address before adding it to the
                      route.
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Prefer a full rebuild? Use “Recalculate Route” above — completed and
                locked stops stay in place.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
