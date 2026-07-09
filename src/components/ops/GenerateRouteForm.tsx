"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  generateRoute,
  type GenerateRouteResult,
} from "@/app/actions/ops/generateRoute";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

interface GenerateRouteFormProps {
  defaultStartAddress: string;
  defaultDate?: string;
}

export function GenerateRouteForm({
  defaultStartAddress,
  defaultDate,
}: GenerateRouteFormProps) {
  const router = useRouter();

  const [result, dispatch, isPending] = useActionState<
    GenerateRouteResult | null,
    FormData
  >(generateRoute, null);

  useEffect(() => {
    if (result?.success && result.routeDate) {
      router.push(`/admin/routes/${result.routeDate}`);
    }
  }, [result, router]);

  return (
    <form action={dispatch} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rt-date">
            Route date <span className="text-destructive">*</span>
          </Label>
          <input
            id="rt-date"
            name="route_date"
            type="date"
            required
            defaultValue={defaultDate ?? ""}
            className={inputClass}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-day-start">Day starts at</Label>
          <input
            id="rt-day-start"
            name="day_start_time"
            type="time"
            required
            defaultValue="08:00"
            className={inputClass}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rt-start">
          Start location <span className="text-destructive">*</span>
        </Label>
        <input
          id="rt-start"
          name="start_address"
          type="text"
          required
          defaultValue={defaultStartAddress}
          placeholder="Home base address"
          className={inputClass}
          disabled={isPending}
        />
      </div>

      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}
      {result?.success && result.warnings && result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
          <ul className="list-inside list-disc">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Building route…
          </>
        ) : (
          <>
            <Route className="mr-2 h-4 w-4" />
            Build Route
          </>
        )}
      </Button>
    </form>
  );
}
