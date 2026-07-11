"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import {
  type AppointmentStatus,
  type Contractor,
  APPOINTMENT_STATUS_CONFIG,
} from "@/lib/types";

const ALL_STATUSES: AppointmentStatus[] = [
  "needs_review",
  "scheduled",
  "routed",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "duplicate",
];

export interface AppointmentFilterValues {
  status?: string;
  contractor?: string;
  date?: string;
  q?: string;
}

interface AppointmentFiltersProps {
  contractors: Pick<Contractor, "id" | "name">[];
  current: AppointmentFilterValues;
}

export function AppointmentFilters({ contractors, current }: AppointmentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(overrides: Partial<AppointmentFilterValues>) {
    const next = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.contractor) params.set("contractor", next.contractor);
    if (next.date) params.set("date", next.date);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters = !!(current.status || current.contractor || current.date || current.q);

  const selectClass =
    "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          apply({ q: typeof value === "string" ? value.trim() : "" });
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          defaultValue={current.q ?? ""}
          placeholder="Name, claim #, city, VIN…"
          className="h-8 w-52 rounded-lg border border-input bg-background pl-8 pr-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring"
        />
      </form>

      <select
        aria-label="Filter by status"
        value={current.status ?? ""}
        onChange={(e) => apply({ status: e.target.value })}
        className={selectClass}
      >
        <option value="">All statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {APPOINTMENT_STATUS_CONFIG[s].label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by contractor"
        value={current.contractor ?? ""}
        onChange={(e) => apply({ contractor: e.target.value })}
        className={selectClass}
      >
        <option value="">All contractors</option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        aria-label="Filter by date"
        type="date"
        value={current.date ?? ""}
        onChange={(e) => apply({ date: e.target.value })}
        className={selectClass}
      />

      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
