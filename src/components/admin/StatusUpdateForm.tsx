"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateJobStatus } from "@/app/actions/updateJobStatus";
import {
  type JobStatus,
  JOB_STATUS_CONFIG,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/types";

interface StatusUpdateFormProps {
  jobId: string;
  currentStatus: JobStatus;
}

export function StatusUpdateForm({ jobId, currentStatus }: StatusUpdateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (allowed.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        This status is final — no further transitions available.
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await updateJobStatus(jobId, selected as JobStatus);
      if (!result.success) {
        setError(result.error ?? "Update failed.");
      } else {
        setSelected("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
        >
          <option value="">Select new status…</option>
          {allowed.map((s) => (
            <option key={s} value={s}>
              {JOB_STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          size="sm"
          disabled={!selected || isPending}
          className="shrink-0 bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Update"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
