import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentStatusBadge } from "@/components/ops/AppointmentStatusBadge";
import { AppointmentFilters } from "@/components/ops/AppointmentFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/types";
import {
  formatDateOnly,
  formatTimeOnly,
  shortLocation,
} from "@/lib/ops/format";
import { CalendarClock, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Appointments — Lomond Appraisal Admin",
};

type AppointmentRow = {
  id: string;
  customer_name: string | null;
  city: string | null;
  state: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  claim_number: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  status: AppointmentStatus;
  contractor: { id: string; name: string } | null;
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    contractor?: string;
    date?: string;
    q?: string;
  }>;
}

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const filters = await searchParams;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let appointments: AppointmentRow[] = [];
  let contractors: { id: string; name: string }[] = [];

  if (isConfigured) {
    const supabase = await createClient();

    const contractorsQuery = supabase
      .from("contractors")
      .select("id, name")
      .order("name");

    let query = supabase
      .from("appointments")
      .select(
        `
        id, customer_name, city, state, appointment_date, appointment_time,
        claim_number, vehicle_year, vehicle_make, vehicle_model, status,
        contractor:contractors(id, name)
      `
      )
      .order("appointment_date", { ascending: true, nullsFirst: false })
      .order("appointment_time", { ascending: true, nullsFirst: false })
      .limit(200);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.contractor) query = query.eq("contractor_id", filters.contractor);
    if (filters.date) query = query.eq("appointment_date", filters.date);

    if (filters.q) {
      // Strip characters that would break the PostgREST or() expression
      const q = filters.q.replace(/[,()%]/g, "").trim();
      if (q) {
        query = query.or(
          [
            `customer_name.ilike.%${q}%`,
            `claim_number.ilike.%${q}%`,
            `reference_number.ilike.%${q}%`,
            `city.ilike.%${q}%`,
            `address_line_1.ilike.%${q}%`,
            `vehicle_make.ilike.%${q}%`,
            `vehicle_model.ilike.%${q}%`,
            `vin.ilike.%${q}%`,
          ].join(",")
        );
      }
    }

    const [{ data: apptData }, { data: contractorData }] = await Promise.all([
      query,
      contractorsQuery,
    ]);
    if (apptData) appointments = apptData as unknown as AppointmentRow[];
    if (contractorData) contractors = contractorData;
  }

  const hasFilters = !!(
    filters.status ||
    filters.contractor ||
    filters.date ||
    filters.q
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Appointments" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Appointments</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {appointments.length} appointment
              {appointments.length !== 1 ? "s" : ""}
              {hasFilters ? " matching current filters" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AppointmentFilters contractors={contractors} current={filters} />
            <Button
              render={<Link href="/admin/appointments/new" />}
              nativeButton={false}
              className="bg-brand-navy text-white hover:bg-brand-navy-dark"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </div>

        {appointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-foreground">No appointments found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasFilters
                    ? "Try clearing the filters to see all appointments."
                    : isConfigured
                    ? "Create an appointment manually or upload assignment PDFs."
                    : "Connect Supabase to see live data."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Date &amp; Time
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Contractor
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Claim #
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {appointments.map((a) => (
                    <tr
                      key={a.id}
                      className="group transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/appointments/${a.id}`}
                          className="font-medium text-brand-navy hover:underline"
                        >
                          {a.appointment_date
                            ? formatDateOnly(a.appointment_date)
                            : "No date"}
                        </Link>
                        {a.appointment_time && (
                          <p className="text-xs text-muted-foreground">
                            {formatTimeOnly(a.appointment_time)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/appointments/${a.id}`}
                          className="hover:underline"
                        >
                          {a.customer_name ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {shortLocation(a.city, a.state)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.contractor?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {a.claim_number ? (
                          <span className="font-mono text-xs">{a.claim_number}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.vehicle_year || a.vehicle_make || a.vehicle_model
                          ? [a.vehicle_year, a.vehicle_make, a.vehicle_model]
                              .filter(Boolean)
                              .join(" ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <AppointmentStatusBadge status={a.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
