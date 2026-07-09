"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  addComparable,
  type AddComparableResult,
} from "@/app/actions/addComparable";

interface ComparableFormProps {
  reportId: string;
}

export function ComparableForm({ reportId }: ComparableFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [result, dispatch, isPending] = useActionState<
    AddComparableResult | null,
    FormData
  >(addComparable, null);

  // Reset on success
  useEffect(() => {
    if (result?.success) {
      formRef.current?.reset();
    }
  }, [result]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      <input type="hidden" name="report_id" value={reportId} />

      {/* Year / Make / Model row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="comp-year">
            Year <span className="text-destructive">*</span>
          </Label>
          <input
            id="comp-year"
            name="year"
            type="number"
            min="1900"
            max={new Date().getFullYear() + 2}
            required
            placeholder={String(new Date().getFullYear())}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comp-make">
            Make <span className="text-destructive">*</span>
          </Label>
          <input
            id="comp-make"
            name="make"
            type="text"
            required
            placeholder="Toyota"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comp-model">
            Model <span className="text-destructive">*</span>
          </Label>
          <input
            id="comp-model"
            name="model"
            type="text"
            required
            placeholder="Camry"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Trim / Mileage row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="comp-trim">Trim</Label>
          <input
            id="comp-trim"
            name="trim"
            type="text"
            placeholder="XLE"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comp-mileage">Mileage</Label>
          <input
            id="comp-mileage"
            name="mileage"
            type="number"
            min="0"
            placeholder="45000"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Condition / Price row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="comp-condition">Condition</Label>
          <input
            id="comp-condition"
            name="condition"
            type="text"
            placeholder="Good / Excellent / Fair"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comp-price">
            Sale Price <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <input
              id="comp-price"
              name="sale_price_dollars"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* Source / Date row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="comp-source">Source</Label>
          <input
            id="comp-source"
            name="source"
            type="text"
            placeholder="AutoTrader, NADA, CarGurus…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comp-date">Listing Date</Label>
          <input
            id="comp-date"
            name="listing_date"
            type="date"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Listing URL */}
      <div className="space-y-1.5">
        <Label htmlFor="comp-url">Listing URL</Label>
        <input
          id="comp-url"
          name="listing_url"
          type="url"
          placeholder="https://…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="comp-notes">Notes</Label>
        <textarea
          id="comp-notes"
          name="notes"
          rows={2}
          placeholder="Optional notes about this comparable…"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Feedback */}
      {result?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Comparable added.
        </div>
      )}
      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding…
          </>
        ) : (
          "Add Comparable"
        )}
      </Button>
    </form>
  );
}
