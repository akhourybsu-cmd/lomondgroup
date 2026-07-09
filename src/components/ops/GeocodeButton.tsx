"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geocodeAppointment } from "@/app/actions/ops/geocodeAppointment";

export function GeocodeButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await geocodeAppointment(appointmentId);
      if (result.success) {
        setMessage({
          ok: true,
          text:
            result.status === "ambiguous"
              ? result.error ?? "Ambiguous match — confirm the address is right."
              : `Address verified: ${result.formattedAddress}`,
        });
      } else {
        setMessage({ ok: false, text: result.error ?? "Verification failed." });
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Verifying…
          </>
        ) : (
          <>
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            Verify Address
          </>
        )}
      </Button>
      {message && (
        <div
          className={
            message.ok
              ? "flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
              : "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
        >
          {message.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
