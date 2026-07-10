"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { MileageRate } from "@/lib/types";
import {
  saveMileageRate,
  type SaveMileageRateResult,
} from "@/app/actions/tax/saveMileageRate";

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

export function MileageRatesEditor({
  rates,
  currentYear,
}: {
  rates: MileageRate[];
  currentYear: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, dispatch, isPending] = useActionState<
    SaveMileageRateResult | null,
    FormData
  >(saveMileageRate, null);

  useEffect(() => {
    if (result?.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [result, router]);

  const hasCurrent = rates.some((r) => r.year === currentYear);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The IRS sets a standard mileage rate each year. Confirm the official rate
        for the current year — the deduction estimate uses it directly.
      </p>

      {!hasCurrent && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          No rate is set for {currentYear}. The deduction is estimated using the
          most recent year&apos;s rate until you set it below.
        </div>
      )}

      {rates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rates.map((r) => (
            <span key={r.year}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-sm">
              <span className="font-medium">{r.year}</span>
              <span className="text-muted-foreground">{r.cents_per_mile}¢/mi</span>
            </span>
          ))}
        </div>
      )}

      <form ref={formRef} action={dispatch} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mr-year">Year</Label>
          <input id="mr-year" name="year" type="number" min="2000" max="2100" required
            defaultValue={currentYear} className={`${input} w-28`} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mr-cents">Rate (cents per mile)</Label>
          <input id="mr-cents" name="cents_per_mile" type="number" step="0.1" min="1" max="500" required
            placeholder="70" className={`${input} w-40`} disabled={isPending} />
        </div>
        <Button type="submit" disabled={isPending}
          className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Rate"}
        </Button>
      </form>

      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{result.error}
        </div>
      )}
    </div>
  );
}
