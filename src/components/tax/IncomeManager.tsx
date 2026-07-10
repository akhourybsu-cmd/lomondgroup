"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Plus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  type IncomeEntry,
  type Contractor,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  centsToDollars,
} from "@/lib/types";
import { saveIncome, type SaveIncomeResult } from "@/app/actions/tax/saveIncome";
import { TaxDeleteButton } from "@/components/tax/TaxDeleteButton";
import { formatDateOnly } from "@/lib/ops/format";

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

interface Props {
  income: (IncomeEntry & { contractor: Pick<Contractor, "id" | "name"> | null })[];
  contractors: Pick<Contractor, "id" | "name">[];
}

export function IncomeManager({ income, contractors }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [result, dispatch, isPending] = useActionState<SaveIncomeResult | null, FormData>(
    saveIncome,
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

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-brand-navy text-white hover:bg-brand-navy-dark">
          <Plus className="mr-1.5 h-4 w-4" />Record Payment
        </Button>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form ref={formRef} action={dispatch} className="space-y-4" key={editing?.id ?? "new"}>
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="in-date">Date <span className="text-destructive">*</span></Label>
                  <input id="in-date" name="income_date" type="date" required
                    defaultValue={editing?.income_date ?? ""} className={input} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="in-amount">Amount <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input id="in-amount" name="amount_dollars" type="text" inputMode="decimal" required
                      defaultValue={editing ? (editing.amount_cents / 100).toFixed(2) : ""}
                      placeholder="0.00" className={`${input} pl-7`} disabled={isPending} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="in-contractor">Contractor / payer</Label>
                  <select id="in-contractor" name="contractor_id" defaultValue={editing?.contractor_id ?? ""}
                    className={input} disabled={isPending}>
                    <option value="">— Not linked —</option>
                    {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="in-source">Payer name (if not a contractor)</Label>
                  <input id="in-source" name="source" type="text" defaultValue={editing?.source ?? ""}
                    className={input} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="in-desc">Description</Label>
                  <input id="in-desc" name="description" type="text" defaultValue={editing?.description ?? ""}
                    placeholder="e.g. 3 inspections — June batch" className={input} disabled={isPending} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="in-method">Payment method</Label>
                  <select id="in-method" name="payment_method" defaultValue={editing?.payment_method ?? ""}
                    className={input} disabled={isPending}>
                    <option value="">—</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="in-ref">Reference / check #</Label>
                  <input id="in-ref" name="reference_number" type="text" defaultValue={editing?.reference_number ?? ""}
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
                  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editing ? "Save Changes" : "Record Payment"}
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

      {income.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No income recorded for this year yet.</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Payer</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {income.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDateOnly(r.income_date)}</td>
                    <td className="px-4 py-2.5">{r.contractor?.name ?? r.source ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.description ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">{centsToDollars(r.amount_cents)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title="Edit" onClick={() => { setEditing(r); setShowForm(true); }}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <TaxDeleteButton table="income_entries" id={r.id} />
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
  );
}
