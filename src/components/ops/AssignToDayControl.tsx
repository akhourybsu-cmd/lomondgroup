"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, CheckCircle2, CalendarPlus, CalendarX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignToDay, unscheduleAppointment } from "@/app/actions/ops/assignToDay";
import { formatDateOnly } from "@/lib/ops/format";

interface Props {
  appointmentId: string;
  currentDate: string | null;
  isScheduled: boolean; // status is scheduled/routed/booked/etc.
  onRoute: boolean; // already has a route stop
}

export function AssignToDayControl({
  appointmentId,
  currentDate,
  isScheduled,
  onRoute,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(currentDate ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function assign() {
    if (!date) {
      setMsg({ ok: false, text: "Pick a day first." });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await assignToDay(appointmentId, date);
      setMsg(r.success ? { ok: true, text: r.message ?? "Assigned." } : { ok: false, text: r.error ?? "Failed." });
      router.refresh();
    });
  }

  function unschedule() {
    setMsg(null);
    startTransition(async () => {
      const r = await unscheduleAppointment(appointmentId);
      if (!r.success) setMsg({ ok: false, text: r.error ?? "Failed." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="assign-date" className="text-xs font-medium text-muted-foreground">
            {isScheduled ? "Scheduled for" : "Assign to day"}
          </label>
          <input
            id="assign-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isPending}
            className="block h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          />
        </div>
        <Button
          size="sm"
          onClick={assign}
          disabled={isPending}
          className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isScheduled && date === currentDate ? "Re-verify Address" : isScheduled ? "Move to This Day" : "Assign to Day"}
        </Button>
        {isScheduled && !onRoute && (
          <Button
            size="sm"
            variant="ghost"
            onClick={unschedule}
            disabled={isPending}
            className="text-muted-foreground"
          >
            <CalendarX className="mr-1.5 h-3.5 w-3.5" />
            Unschedule
          </Button>
        )}
      </div>

      {onRoute && currentDate && (
        <p className="text-xs text-muted-foreground">
          On the route for {formatDateOnly(currentDate)}. Moving it to another day
          removes it from that route — recalculate the old day afterward.
        </p>
      )}

      {msg && (
        <div
          className={
            msg.ok
              ? "flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
              : "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
        >
          {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {msg.text}
        </div>
      )}
    </div>
  );
}
