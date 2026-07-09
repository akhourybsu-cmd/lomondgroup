import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { JobStatusBadge } from "@/components/admin/JobStatusBadge";
import { JobBoardFilters } from "@/components/admin/JobBoardFilters";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  type JobStatus,
  type AppraisalType,
  APPRAISAL_TYPE_LABELS,
} from "@/lib/types";
import { Inbox } from "lucide-react";

export const metadata: Metadata = {
  title: "Job Board — Lomond Appraisal Admin",
};

// ── Local types for Supabase query shape ─────────────────────────────────────

type JobRow = {
  id: string;
  appraisal_type: AppraisalType;
  status: JobStatus;
  priority: "normal" | "high" | "urgent";
  internal_ref: string | null;
  created_at: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
  } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border border-red-200",
  high: "bg-amber-100 text-amber-700 border border-amber-200",
  normal: "bg-secondary text-muted-foreground border border-border",
};

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function JobBoardPage({ searchParams }: PageProps) {
  const { status: statusFilter } = await searchParams;

  // ── Dev bypass when Supabase is not configured ──────────────────────────
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let jobs: JobRow[] = [];

  if (isConfigured) {
    const supabase = await createClient();

    let query = supabase
      .from("appraisal_jobs")
      .select(
        `
        id, appraisal_type, status, priority, internal_ref, created_at,
        client:clients(id, first_name, last_name, email),
        vehicle:vehicles(id, year, make, model, trim)
      `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    if (data) jobs = data as unknown as JobRow[];
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Jobs" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Job Board</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""}
              {statusFilter ? " matching current filter" : " total"}
            </p>
          </div>
          <JobBoardFilters currentStatus={statusFilter} />
        </div>

        {/* Table */}
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-foreground">No jobs found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {statusFilter
                    ? "Try clearing the status filter to see all jobs."
                    : isConfigured
                    ? "Jobs submitted via the intake form will appear here."
                    : "Connect Supabase to see live job data."}
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
                      Ref
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="group transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="font-mono text-xs font-medium text-brand-navy hover:underline group-hover:text-brand-navy"
                        >
                          {job.internal_ref ?? job.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {job.client ? (
                          <div>
                            <Link
                              href={`/admin/jobs/${job.id}`}
                              className="font-medium hover:underline"
                            >
                              {job.client.first_name} {job.client.last_name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {job.client.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {job.vehicle ? (
                          <span>
                            {job.vehicle.year} {job.vehicle.make}{" "}
                            {job.vehicle.model}
                            {job.vehicle.trim && (
                              <span className="text-muted-foreground">
                                {" "}
                                {job.vehicle.trim}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {APPRAISAL_TYPE_LABELS[job.appraisal_type]}
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium capitalize ${
                            PRIORITY_STYLES[job.priority] ??
                            PRIORITY_STYLES.normal
                          }`}
                        >
                          {job.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(job.created_at)}
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
