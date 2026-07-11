import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentStatusBadge } from "@/components/ops/AppointmentStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/types";
import {
  formatDateOnly,
  formatTimeOnly,
  shortLocation,
} from "@/lib/ops/format";
import { CalendarClock, Route } from "lucide-react";

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  return { title: `${date} — Lomond Appraisal Admin` };
}

type DayAppointment = {
  id: string;
  customer_name: string | null;
  appointment_time: string | null;
  city: string | null;
  state: string | null;
  status: AppointmentStatus;
  geocoding_status: string;
  contractor: { name: string } | null;
};

export default async function CalendarDayPage({ params }: PageProps) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const [{ data: appointments }, { data: routes }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, customer_name, appointment_time, city, state, status, geocoding_status, contractor:contractors(name)"
      )
      .eq("appointment_date", date)
      .not("status", "in", '("cancelled","duplicate")')
      .order("appointment_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("daily_routes")
      .select("id, route_status")
      .eq("route_date", date)
      .in("route_status", ["draft", "active", "completed"])
      .limit(1),
  ]);

  const dayAppointments = (appointments ?? []) as unknown as DayAppointment[];
  const hasRoute = (routes ?? []).length > 0;
  const scheduledCount = dayAppointments.filter((a) =>
    ["scheduled", "routed", "booked", "in_progress", "completed", "confirmed"].includes(
      a.status
    )
  ).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Calendar", href: "/admin/calendar" },
          { label: formatDateOnly(date) },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {formatDateOnly(date)}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {dayAppointments.length} appointment
              {dayAppointments.length !== 1 ? "s" : ""} · {scheduledCount} scheduled
              {hasRoute ? " · route built" : ""}
            </p>
          </div>
          <Button
            render={<Link href={hasRoute ? `/admin/routes/${date}` : `/admin/routes?date=${date}`} />}
            nativeButton={false}
            className="bg-brand-navy text-white hover:bg-brand-navy-dark"
          >
            <Route className="mr-1.5 h-4 w-4" />
            {hasRoute ? "Open Route" : "Build Route"}
          </Button>
        </div>

        {dayAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No appointments on this day</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {dayAppointments.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/appointments/${a.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-secondary/30"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="w-20 shrink-0 font-medium">
                      {a.appointment_time ? formatTimeOnly(a.appointment_time) : "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {a.customer_name ?? "Unnamed appointment"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shortLocation(a.city, a.state)}
                        {a.contractor ? ` · ${a.contractor.name}` : ""}
                        {a.geocoding_status !== "success" &&
                          ["scheduled", "routed", "booked"].includes(a.status) &&
                          " · address not verified"}
                      </p>
                    </div>
                  </div>
                  <AppointmentStatusBadge status={a.status} size="sm" />
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
