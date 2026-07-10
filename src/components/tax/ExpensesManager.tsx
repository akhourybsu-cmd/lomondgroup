"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, Plus, Pencil, Paperclip, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  type BusinessExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_CONFIG,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  centsToDollars,
} from "@/lib/types/tax";
import { saveExpense, type SaveExpenseResult } from "@/app/actions/tax/saveExpense";
import { getReceiptUrl } from "@/app/actions/tax/getReceiptUrl";
import { TaxDeleteButton } from "@/components/tax/TaxDeleteButton";
import { formatDateOnly } from "@/lib/ops/format";

const input =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

export function ExpensesManager({ expenses }: { expenses: BusinessExpense[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState<BusinessExpense | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [result, dispatch, isPending] = useActionState<SaveExpenseResult | null, FormData>(
    saveExpense,
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

  function startEdit(e: BusinessExpense) {
    setEditing(e);
    setShowForm(true);
  }
  function startAdd() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button onClick={startAdd} className="bg-brand-navy text-white hover:bg-brand-navy-dark">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Expense
        </Button>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form ref={formRef} action={dispatch} className="space-y-4" key={editing?.id ?? "new"}>
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ex-date">Date <span className="text-destructive">*</span></Label>
                  <input id="ex-date" name="expense_date" type="date" required
                    defaultValue={editing?.expense_date ?? ""} className={input} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-amount">Amount <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input id="ex-amount" name="amount_dollars" type="text" inputMode="decimal" required
                      defaultValue={editing ? (editing.amount_cents / 100).toFixed(2) : ""}
                      placeholder="0.00" className={`${input} pl-7`} disabled={isPending} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-cat">Category <span className="text-destructive">*</span></Label>
                  <select id="ex-cat" name="category" required defaultValue={editing?.category ?? "supplies"}
                    className={input} disabled={isPending}
                    onChange={(e) => {
                      const pct = EXPENSE_CATEGORY_CONFIG[e.target.value as keyof typeof EXPENSE_CATEGORY_CONFIG].defaultDeductible;
                      const field = formRef.current?.elements.namedItem("deductible_percent") as HTMLInputElement | null;
                      if (field && !editing) field.value = String(pct);
                    }}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{EXPENSE_CATEGORY_CONFIG[c].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-desc">Description <span className="text-destructive">*</span></Label>
                <input id="ex-desc" name="description" type="text" required
                  defaultValue={editing?.description ?? ""} placeholder="e.g. Diagnostic scan tool"
                  className={input} disabled={isPending} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ex-vendor">Vendor</Label>
                  <input id="ex-vendor" name="vendor" type="text" defaultValue={editing?.vendor ?? ""}
                    className={input} disabled={isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-method">Payment method</Label>
                  <select id="ex-method" name="payment_method" defaultValue={editing?.payment_method ?? ""}
                    className={input} disabled={isPending}>
                    <option value="">—</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-ded">Deductible %</Label>
                  <input id="ex-ded" name="deductible_percent" type="number" min="0" max="100"
                    defaultValue={editing?.deductible_percent ?? 100} className={input} disabled={isPending} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-receipt">Receipt (optional — PDF or image)</Label>
                <input id="ex-receipt" name="receipt" type="file" accept="application/pdf,image/*"
                  className={`${input} file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm`}
                  disabled={isPending} />
                {editing?.receipt_storage_path && (
                  <p className="text-xs text-muted-foreground">A receipt is already attached — upload a new file to replace it.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-notes">Notes</Label>
                <textarea id="ex-notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""}
                  className={`${input} resize-none`} disabled={isPending} />
              </div>

              {result && !result.success && result.error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {result.error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isPending}
                  className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50">
                  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editing ? "Save Changes" : "Add Expense"}
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

      <ExpenseTable expenses={expenses} onEdit={startEdit} />
    </div>
  );
}

function ExpenseTable({
  expenses, onEdit,
}: { expenses: BusinessExpense[]; onEdit: (e: BusinessExpense) => void }) {
  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No expenses recorded for this year yet.</p>;
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Deductible</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-secondary/30">
                <td className="whitespace-nowrap px-4 py-2.5">{formatDateOnly(e.expense_date)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{EXPENSE_CATEGORY_CONFIG[e.category].label}</td>
                <td className="px-4 py-2.5">
                  {e.description}
                  {e.vendor && <span className="text-muted-foreground"> · {e.vendor}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">{centsToDollars(e.amount_cents)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">
                  {centsToDollars(Math.round((e.amount_cents * e.deductible_percent) / 100))}
                  {e.deductible_percent !== 100 && <span className="text-xs"> ({e.deductible_percent}%)</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {e.receipt_storage_path && <ReceiptButton expenseId={e.id} />}
                    <IconBtn title="Edit" onClick={() => onEdit(e)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                    <TaxDeleteButton table="business_expenses" id={e.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground">
      {children}
    </button>
  );
}

function ReceiptButton({ expenseId }: { expenseId: string }) {
  const [isPending, start] = useTransition();
  return (
    <button type="button" title="View receipt" disabled={isPending}
      onClick={() => start(async () => {
        const r = await getReceiptUrl(expenseId);
        if (r.success && r.url) window.open(r.url, "_blank", "noopener");
      })}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground">
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
    </button>
  );
}

