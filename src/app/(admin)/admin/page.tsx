import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Inbox,
  Briefcase,
  FileWarning,
  FileText,
  DollarSign,
  CheckCircle2,
  CalendarClock,
  ClipboardCheck,
  Route,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatCard } from "@/components/admin/StatCard";
import { JobStatusBadge } from "@/components/admin/JobStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { type JobStatus, type AppraisalType, APPRAISAL_TYPE_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard — Lomond Appraisal Admin",
};

type RecentJob = {
  id: string;
  appraisal_type: AppraisalType;
  status: JobStatus;
  internal_ref: string | null;
  created_at: string;
  client: { first_name: string; last_name: string } | null;
  vehicle: { year: number; make: string; model: string } | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AdminDashboardPage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Stat counts
  let newCount = 0;
  let activeCount = 0;
  let docsNeededCount = 0;
  let reportDraftedCount = 0;
  let unpaidCount = 0;
  let closedThisMonthCount = 0;
  let recentJobs: RecentJob[] = [];

  // Operations (appointments + routing)
  let apptsTodayCount = 0;
  let needsReviewCount = 0;
  let failedUploadsCount = 0;
  let hasRouteToday = false;
  let todayStr = "";

  if (isConfigured) {
    const supabase = await createClient();

    // Parallel count queries (HEAD requests — very fast)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [
      { count: _apptsToday },
      { count: _needsReview },
      { count: _failedUploads },
      { data: _todayRoute },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", todayStr)
        .not("status", "in", '("cancelled","duplicate")'),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "needs_review"),
      supabase
        .from("pdf_uploads")
        .select("*", { count: "exact", head: true })
        .in("processing_status", ["failed", "needs_review"]),
      supabase
        .from("daily_routes")
        .select("id")
        .eq("route_date", todayStr)
        .in("route_status", ["draft", "active"])
        .limit(1),
    ]);
    apptsTodayCount = _apptsToday ?? 0;
    needsReviewCount = _needsReview ?? 0;
    failedUploadsCount = _failedUploads ?? 0;
    hasRouteToday = (_todayRoute ?? []).length > 0;

    const [
      { count: _new },
      { count: _active },
      { count: _docs },
      { count: _drafted },
      { count: _unpaid },
      { count: _closed },
      { data: _recent },
    ] = await Promise.all([
      supabase
        .from("appraisal_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "new_request"),
      supabase
        .from("appraisal_jobs")
        .select("*", { count: "exact", head: true })
        .in("status", [
          "contacted",
          "inspection_scheduled",
          "in_progress",
          "on_hold",
        ]),
      supabase
        .from("appraisal_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "documents_needed"),
      supabase
        .from("appraisal_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "report_drafted"),
      supabase
        .from("appraisal_jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["sent_to_client", "awaiting_payment"]),
      supabase
        .from("appraisal_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "paid_closed")
        .gte("updated_at", monthStart),
      supabase
        .from("appraisal_jobs")
        .select(
          `
          id, appraisal_type, status, internal_ref, created_at,
          client:clients(first_name, last_name),
          vehicle:vehicles(year, make, model)
        `
        )
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    newCount = _new ?? 0;
    activeCount = _active ?? 0;
    docsNeededCount = _docs ?? 0;
    reportDraftedCount = _drafted ?? 0;
    unpaidCount = _unpaid ?? 0;
    closedThisMonthCount = _closed ?? 0;
    if (_recent) recentJobs = _recent as unknown as RecentJob[];
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Overview of appraisal jobs and status
            </p>
          </div>
          <Link
            href="/admin/jobs"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-brand-navy text-white hover:bg-brand-navy-dark"
            )}
          >
            View All Jobs
          </Link>
        </div>

        {/* Operations (appointments + routing) */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Field Operations
        </p>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href={hasRouteToday && todayStr ? `/admin/routes/${todayStr}` : "/admin/routes"}>
            <StatCard
              title="Today's Route"
              value={hasRouteToday ? "Ready" : "Not built"}
              description={hasRouteToday ? "Open the day's route" : "Build from confirmed appts"}
              icon={Route}
              urgency={!hasRouteToday && apptsTodayCount > 0 ? "warning" : undefined}
            />
          </Link>
          <Link href={todayStr ? `/admin/calendar/${todayStr}` : "/admin/calendar"}>
            <StatCard
              title="Appointments Today"
              value={apptsTodayCount}
              description="On the calendar"
              icon={CalendarClock}
            />
          </Link>
          <Link href="/admin/appointments?status=needs_review">
            <StatCard
              title="Needs Review"
              value={needsReviewCount}
              description="Extracted or new drafts"
              icon={ClipboardCheck}
              urgency={needsReviewCount > 0 ? "alert" : undefined}
            />
          </Link>
          <Link href="/admin/uploads">
            <StatCard
              title="Upload Issues"
              value={failedUploadsCount}
              description="Failed or needing review"
              icon={FileWarning}
              urgency={failedUploadsCount > 0 ? "warning" : undefined}
            />
          </Link>
        </div>

        {/* KPI cards */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Appraisal Jobs
        </p>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="New Requests"
            value={newCount}
            description="Awaiting review"
            icon={Inbox}
            urgency={newCount > 0 ? "alert" : undefined}
          />
          <StatCard
            title="Active Jobs"
            value={activeCount}
            description="In progress"
            icon={Briefcase}
          />
          <StatCard
            title="Docs Needed"
            value={docsNeededCount}
            description="Waiting on client"
            icon={FileWarning}
            urgency={docsNeededCount > 0 ? "warning" : undefined}
          />
          <StatCard
            title="Reports Drafted"
            value={reportDraftedCount}
            description="Ready to finalize"
            icon={FileText}
          />
          <StatCard
            title="Unpaid"
            value={unpaidCount}
            description="Awaiting payment"
            icon={DollarSign}
            urgency={unpaidCount > 0 ? "warning" : undefined}
          />
          <StatCard
            title="Closed"
            value={closedThisMonthCount}
            description="This month"
            icon={CheckCircle2}
          />
        </div>

        {/* Recent jobs + quick actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">
                  Recent Jobs
                </CardTitle>
                <Link
                  href="/admin/jobs"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "text-xs"
                  )}
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {recentJobs.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-secondary/30 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isConfigured
                        ? "No jobs yet — they'll appear here once submitted."
                        : "Connect Supabase to see live job data."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/admin/jobs/${job.id}`}
                        className="flex items-center justify-between gap-4 py-2.5 text-sm transition-colors hover:bg-secondary/30 -mx-2 px-2 rounded-md"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium text-brand-navy">
                              {job.internal_ref ?? job.id.slice(0, 8).toUpperCase()}
                            </span>
                            {job.client && (
                              <span className="font-medium truncate">
                                {job.client.first_name} {job.client.last_name}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {job.vehicle
                              ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}`
                              : APPRAISAL_TYPE_LABELS[job.appraisal_type]}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <JobStatusBadge status={job.status} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(job.created_at)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  href="/admin/jobs"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start text-sm"
                  )}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Job Board
                </Link>
                <Link
                  href="/admin/clients"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start text-sm"
                  )}
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  Clients
                </Link>
                <Link
                  href="/admin/jobs?status=new_request"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start text-sm"
                  )}
                >
                  <Inbox className="mr-2 h-4 w-4 text-blue-600" />
                  New Requests
                  {newCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-medium text-white">
                      {newCount}
                    </span>
                  )}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
