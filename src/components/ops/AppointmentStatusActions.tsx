"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type AppointmentStatus,
  VALID_APPOINTMENT_TRANSITIONS,
} from "@/lib/types";
import { updateAppointmentStatus } from "@/app/actions/ops/updateAppointmentStatus";

const ACTION_LABELS: Partial<Record<AppointmentStatus, string>> = {
  in_progress: "Mark In Progress",
  completed: "Mark Completed",
  cancelled: "Cancel Appointment",
  duplicate: "Mark as Duplicate",
  needs_review: "Reopen / Unschedule",
};

/** Ordering: primary action first, destructive last */
const ACTION_ORDER: AppointmentStatus[] = [
  "in_progress",
  "completed",
  "needs_review",
  "duplicate",
  "cancelled",
];

interface AppointmentStatusActionsProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: AppointmentStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = ACTION_ORDER.filter((s) =>
    (VALID_APPOINTMENT_TRANSITIONS[currentStatus] ?? []).includes(s)
  );

  if (available.length === 0) return null;

  function handleClick(status: AppointmentStatus) {
    setError(null);
    setPendingStatus(status);
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointmentId, status);
      if (!result.success) {
        setError(result.error ?? "Failed to update status.");
      } else {
        router.refresh();
      }
      setPendingStatus(null);
    });
  }

  function buttonStyle(status: AppointmentStatus): string {
    if (status === "cancelled") {
      return "border border-destructive/30 bg-background text-destructive hover:bg-destructive/5";
    }
    return "border border-border bg-background text-foreground hover:bg-secondary";
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {available.map((status) => (
          <Button
            key={status}
            size="sm"
            onClick={() => handleClick(status)}
            disabled={isPending}
            className={buttonStyle(status)}
          >
            {isPending && pendingStatus === status && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {ACTION_LABELS[status] ?? status}
          </Button>
        ))}
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
