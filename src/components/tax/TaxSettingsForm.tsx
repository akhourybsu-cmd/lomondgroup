"use client";

import { useActionState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  type TaxSettings,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
} from "@/lib/types";
import {
  updateTaxSettings,
  type UpdateTaxSettingsResult,
} from "@/app/actions/tax/updateTaxSettings";

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

export function TaxSettingsForm({ settings }: { settings: TaxSettings }) {
  const [result, dispatch, isPending] = useActionState<
    UpdateTaxSettingsResult | null,
    FormData
  >(updateTaxSettings, null);

  return (
    <form action={dispatch} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ts-name">Business name</Label>
          <input id="ts-name" name="business_name" type="text"
            defaultValue={settings.business_name ?? ""} className={input} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ts-entity">Entity type</Label>
          <select id="ts-entity" name="entity_type" defaultValue={settings.entity_type ?? ""}
            className={input} disabled={isPending}>
            <option value="">—</option>
            {ENTITY_TYPES.map((e) => (
              <option key={e} value={e}>{ENTITY_TYPE_LABELS[e]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ts-ein">EIN (optional)</Label>
          <input id="ts-ein" name="ein" type="text" defaultValue={settings.ein ?? ""}
            placeholder="00-0000000" className={input} disabled={isPending} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ts-state">State</Label>
          <input id="ts-state" name="state" type="text" maxLength={2}
            defaultValue={settings.state ?? "MA"} className={`${input} uppercase`} disabled={isPending} />
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3">
        <input id="ts-roundtrip" name="mileage_round_trip" type="checkbox"
          defaultChecked={settings.mileage_round_trip}
          className="mt-0.5 h-4 w-4 rounded border-input accent-brand-navy" disabled={isPending} />
        <Label htmlFor="ts-roundtrip" className="font-normal leading-snug">
          Count route mileage as round-trip
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Includes the drive from the last stop back to your home base. Since your
            office is your home base, that return leg is generally deductible.
          </span>
        </Label>
      </div>

      {result?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />Settings saved.
        </div>
      )}
      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{result.error}
        </div>
      )}

      <Button type="submit" disabled={isPending}
        className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50">
        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Settings"}
      </Button>
    </form>
  );
}
