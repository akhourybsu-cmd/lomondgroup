import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Route } from "lucide-react";

export const metadata: Metadata = {
  title: "Calendar — Lomond Appraisal Admin",
};

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

interface DaySummary {
  total: number;
  needsReview: number;
  confirmed: number;
  routed: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const { month } = await searchParams;

  const today = new Date();
  const [year, monthIndex] = /^\d{4}-\d{2}$/.test(month ?? "")
    ? [Number(month!.slice(0, 4)), Number(month!.slice(5, 7)) - 1]
    : [today.getFullYear(), today.getMonth()];

  const monthStart = `${year}-${pad(monthIndex + 1)}-01`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthEnd = `${year}-${pad(monthIndex + 1)}-${pad(daysInMonth)}`;
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

  const prevMonth = `${monthIndex === 0 ? year - 1 : year}-${pad(monthIndex === 0 ? 12 : monthIndex)}`;
  const nextMonth = `${monthIndex === 11 ? year + 1 : year}-${pad(monthIndex === 11 ? 1 : monthIndex + 2)}`;
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const byDate = new Map<string, DaySummary>();

  if (isConfigured) {
    const supabase = await createClient();
    const [{ data: appointments }, { data: routes }] = await Promise.all([
      supabase
        .from("appointments")
        .select("appointment_date, status")
        .gte("appointment_date", monthStart)
        .lte("appointment_date", monthEnd)
        .not("status", "in", '("cancelled","duplicate")'),
      supabase
        .from("daily_routes")
        .select("route_date")
        .gte("route_date", monthStart)
        .lte("route_date", monthEnd)
        .in("route_status", ["draft", "active", "completed"]),
    ]);

    for (const a of appointments ?? []) {
      if (!a.appointment_date) continue;
      const entry = byDate.get(a.appointment_date) ?? {
        total: 0,
        needsReview: 0,
        confirmed: 0,
        routed: false,
      };
      entry.total++;
      const status = a.status as AppointmentStatus;
      if (status === "needs_review") entry.needsReview++;
      if (status === "confirmed") entry.confirmed++;
      byDate.set(a.appointment_date, entry);
    }
    for (const r of routes ?? []) {
      const entry = byDate.get(r.route_date);
      if (entry) entry.routed = true;
      else
        byDate.set(r.route_date, {
          total: 0,
          needsReview: 0,
          confirmed: 0,
          routed: true,
        });
    }
  }

  // Build the grid: leading blanks + day cells
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`
    ),
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Calendar" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{monthLabel}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Appointments by day — click a day for details and routing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/calendar?month=${prevMonth}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-secondary"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/calendar"
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
            >
              Today
            </Link>
            <Link
              href={`/admin/calendar?month=${nextMonth}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-secondary"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/40 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date)
                return <div key={`blank-${i}`} className="min-h-24 border-b border-r border-border/60 bg-secondary/20" />;
              const summary = byDate.get(date);
              const dayNumber = Number(date.slice(8, 10));
              const isToday = date === todayStr;
              return (
                <Link
                  key={date}
                  href={`/admin/calendar/${date}`}
                  className={cn(
                    "min-h-24 border-b border-r border-border/60 p-1.5 transition-colors hover:bg-secondary/40",
                    isToday && "bg-blue-50/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday
                          ? "bg-brand-navy font-semibold text-white"
                          : "text-muted-foreground"
                      )}
                    >
                      {dayNumber}
                    </span>
                    {summary?.routed && (
                      <Route className="h-3.5 w-3.5 text-brand-navy" aria-label="Route built" />
                    )}
                  </div>
                  {summary && summary.total > 0 && (
                    <div className="mt-1 space-y-0.5 text-[11px] leading-tight">
                      <p className="font-medium text-foreground">
                        {summary.total} appt{summary.total !== 1 ? "s" : ""}
                      </p>
                      {summary.needsReview > 0 && (
                        <p className="text-amber-700">
                          {summary.needsReview} to review
                        </p>
                      )}
                      {summary.confirmed > 0 && (
                        <p className="text-green-700">{summary.confirmed} confirmed</p>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
