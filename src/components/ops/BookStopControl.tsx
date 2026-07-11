"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookAppointment } from "@/app/actions/ops/bookAppointment";
import { formatTimeOnly } from "@/lib/ops/format";

interface Props {
  appointmentId: string;
  booked: boolean;
  bookedTime: string | null;
  /** Suggested time to prefill — the stop's estimated arrival */
  suggestedTime: string | null;
}

/**
 * Book a stop's time with the customer. Prefills the route's estimated
 * arrival so the appraiser can offer that when they call. Booking pins
 * the stop so a later recalc holds it near the booked time.
 */
export function BookStopControl({
  appointmentId,
  booked,
  bookedTime,
  suggestedTime,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState((bookedTime ?? suggestedTime ?? "").slice(0, 5));
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!time) {
      setError("Enter a time.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await bookAppointment(appointmentId, time);
      if (!r.success) {
        setError(r.error ?? "Failed to book.");
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant={booked ? "outline" : "default"}
        onClick={() => setOpen(true)}
        className={
          booked
            ? "border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
            : "bg-brand-navy text-white hover:bg-brand-navy-dark"
        }
      >
        <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
        {booked && bookedTime ? `Booked ${formatTimeOnly(bookedTime)}` : "Book Time"}
      </Button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={isPending}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={isPending}
          className="bg-brand-navy text-white hover:bg-brand-navy-dark"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </Button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={isPending}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}
