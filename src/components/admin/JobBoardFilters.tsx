"use client";

import { useRouter, usePathname } from "next/navigation";
import { type JobStatus, JOB_STATUS_CONFIG } from "@/lib/types";

const ALL_STATUSES: JobStatus[] = [
  "new_request",
  "contacted",
  "documents_needed",
  "inspection_scheduled",
  "in_progress",
  "report_drafted",
  "sent_to_client",
  "awaiting_payment",
  "on_hold",
  "needs_owner_review",
  "paid_closed",
  "canceled",
  "declined",
];

interface JobBoardFiltersProps {
  currentStatus?: string;
}

export function JobBoardFilters({ currentStatus }: JobBoardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleStatusChange(value: string) {
    if (value) {
      router.push(`${pathname}?status=${encodeURIComponent(value)}`);
    } else {
      router.push(pathname);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor="status-filter"
        className="text-sm font-medium text-muted-foreground"
      >
        Filter:
      </label>
      <select
        id="status-filter"
        value={currentStatus ?? ""}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
      >
        <option value="">All statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {JOB_STATUS_CONFIG[s].label}
          </option>
        ))}
      </select>

      {currentStatus && (
        <button
          onClick={() => handleStatusChange("")}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
