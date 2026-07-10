"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Plus, Pencil, X, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MileageEntry, RouteMileageLine } from "@/lib/types";
import {
  saveMileageEntry,
  type SaveMileageResult,
} from "@/app/actions/tax/saveMileageEntry";
import { TaxDeleteButton } from "@/components/tax/TaxDeleteButton";
import { formatDateOnly } from "@/lib/ops/format";

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

interface Props {
  routeLines: RouteMileageLine[];
  manualEntries: MileageEntry[];
  roundTrip: boolean;
}

export function MileageManager({ routeLines, manualEntries, roundTrip }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<MileageEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [result, dispatch, isPending] = useActionState<SaveMileageResult | null, FormData>(
    saveMileageEntry,
    null
  );

  useEffect(() => {
    if (result?.success) {
      formRef.current?.reset();
      setEditing(null);
      setShowForm(false);
      router.refresh();
    }
  }, [result, router]);

  const routeTotal = routeLines.reduce((s, l) => s + l.countedMiles, 0);
  const manualTotal = manualEntries.reduce((s, m) => s + m.miles, 0);

  return (
    <div className="space-y-6">
      {/* Route-derived mileage (read-only) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            From routes — {Math.round(routeTotal * 10) / 10} mi
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {roundTrip ? "Round-trip (incl. return to base)" : "One-way"}
          </span>
        </CardHeader>
        <CardContent>
          {routeLines.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No routes built this year yet. Route mileage flows in here automatically.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-left font-medium">Date</th>
                    <th className="py-2 text-left font-medium">Stops</th>
                    <th className="py-2 text-right font-medium">One-way</th>
                    <th className="py-2 text-right font-medium">Return</th>
                    <th className="py-2 text-right font-medium">Counted</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {routeLines.map((l) => (
                    <tr key={l.routeId}>
                      <td className="py-2">{formatDateOnly(l.routeDate)}</td>
                      <td className="py-2 text-muted-foreground">{l.stops}</td>
                      <td className="py-2 text-right text-muted-foreground">{l.oneWayMiles}</td>
                      <td className="py-2 text-right text-muted-foreground">{l.returnMiles}</td>
                      <td className="py-2 text-right font-medium">{l.countedMiles}</td>
                      <td className="py-2 text-right">
                        <Link href={`/admin/routes/${l.routeDate}`}
                          className="inline-flex items-center gap-1 text-xs text-brand-navy hover:underline">
                          <RouteIcon className="h-3 w-3" />View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual mileage entries */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Manual trips — {Math.round(manualTotal * 10) / 10} mi
          </h2>
          {!showForm && (
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-brand-navy text-white hover:bg-brand-navy-dark">
              <Plus className="mr-1.5 h-4 w-4" />Add Trip
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <form ref={formRef} action={dispatch} className="space-y-4" key={editing?.id ?? "new"}>
                {editing && <input type="hidden" name="id" value={editing.id} />}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mi-date">Date <span className="text-destructive">*</span></Label>
                    <input id="mi-date" name="trip_date" type="date" required
                      defaultValue={editing?.trip_date ?? ""} className={input} disabled={isPending} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mi-miles">Miles <span className="text-destructive">*</span></Label>
                    <input id="mi-miles" name="miles" type="number" step="0.1" min="0.1" required
                      defaultValue={editing?.miles ?? ""} className={input} disabled={isPending} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mi-purpose">Purpose <span className="text-destructive">*</span></Label>
                    <input id="mi-purpose" name="purpose" type="text" required
                      defaultValue={editing?.purpose ?? ""} placeholder="e.g. Parts pickup"
                      className={input} disabled={isPending} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mi-from">From</Label>
                    <input id="mi-from" name="from_location" type="text" defaultValue={editing?.from_location ?? ""}
                      className={input} disabled={isPending} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mi-to">To</Label>
                    <input id="mi-to" name="to_location" type="text" defaultValue={editing?.to_location ?? ""}
                      className={input} disabled={isPending} />
                  </div>
                </div>

                {result && !result.success && result.error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />{result.error}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isPending}
                    className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50">
                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editing ? "Save Changes" : "Add Trip"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={isPending}
                    onClick={() => { setShowForm(false); setEditing(null); }}>
                    <X className="mr-1 h-4 w-4" />Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {manualEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No manual trips logged. Use this for business driving not covered by a built route.
          </p>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium">Purpose</th>
                    <th className="px-4 py-2.5 text-left font-medium">Route</th>
                    <th className="px-4 py-2.5 text-right font-medium">Miles</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {manualEntries.map((m) => (
                    <tr key={m.id} className="hover:bg-secondary/30">
                      <td className="whitespace-nowrap px-4 py-2.5">{formatDateOnly(m.trip_date)}</td>
                      <td className="px-4 py-2.5">{m.purpose}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {m.from_location && m.to_location ? `${m.from_location} → ${m.to_location}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">{m.miles}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" title="Edit" onClick={() => { setEditing(m); setShowForm(true); }}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <TaxDeleteButton table="mileage_entries" id={m.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
