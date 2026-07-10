import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TaxTabs } from "@/components/tax/TaxTabs";
import { YearSelector } from "@/components/tax/YearSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getTaxYearSummary, getYearsWithData } from "@/lib/tax/summary";
import { EXPENSE_CATEGORY_CONFIG, centsToDollars } from "@/lib/types/tax";
import {
  AlertTriangle,
  Download,
  DollarSign,
  Receipt,
  Car,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Taxes — Lomond Appraisal Admin",
};

const CURRENT_YEAR = 2026;

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

function resolveYear(raw: string | undefined): number {
  const y = Number(raw);
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : CURRENT_YEAR;
}

export default async function TaxOverviewPage({ searchParams }: PageProps) {
  const { year: rawYear } = await searchParams;
  const year = resolveYear(rawYear);

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const [summary, years] = await Promise.all([
    getTaxYearSummary(supabase, year),
    getYearsWithData(supabase, CURRENT_YEAR),
  ]);

  const netPositive = summary.netCents >= 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Taxes" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Taxes &amp; Bookkeeping</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Income, deductible expenses, and business mileage for {year}.
            </p>
          </div>
          <YearSelector years={years} current={year} />
        </div>

        <TaxTabs year={year} />

        {/* Summary tiles */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            title="Income"
            value={centsToDollars(summary.incomeCents)}
            sub={`${summary.incomeCount} payment${summary.incomeCount !== 1 ? "s" : ""} recorded`}
            icon={DollarSign}
          />
          <SummaryTile
            title="Deductible Expenses"
            value={centsToDollars(summary.expenseDeductibleCents)}
            sub={
              summary.expenseTotalCents !== summary.expenseDeductibleCents
                ? `of ${centsToDollars(summary.expenseTotalCents)} spent`
                : "across all categories"
            }
            icon={Receipt}
          />
          <SummaryTile
            title="Mileage Deduction"
            value={centsToDollars(summary.mileageDeductionCents)}
            sub={`${summary.totalMiles.toLocaleString()} mi × ${summary.mileageRateCents}¢${summary.mileageRateIsFallback ? " (est.)" : ""}`}
            icon={Car}
          />
          <SummaryTile
            title="Est. Net (pre-tax)"
            value={centsToDollars(summary.netCents)}
            sub={netPositive ? "income − deductions" : "deductions exceed income"}
            icon={TrendingUp}
          />
        </div>

        {summary.mileageRateIsFallback && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            No IRS mileage rate is set for {year} — the estimate uses the most
            recent year&apos;s rate ({summary.mileageRateCents}¢/mi). Set the
            official rate in Settings.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Expense breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.expenseByCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No expenses recorded for {year}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 text-left font-medium">Category</th>
                        <th className="py-2 text-left font-medium">Schedule C</th>
                        <th className="py-2 text-right font-medium">Deductible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.expenseByCategory.map((c) => (
                        <tr key={c.category}>
                          <td className="py-2">
                            {EXPENSE_CATEGORY_CONFIG[c.category].label}
                            <span className="text-muted-foreground"> · {c.count}</span>
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {EXPENSE_CATEGORY_CONFIG[c.category].scheduleC}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {centsToDollars(c.deductibleCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export + mileage split */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export for {year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="mb-2 text-xs text-muted-foreground">
                  CSV files for your accountant.
                </p>
                <ExportLink year={year} type="income" label="Income (CSV)" />
                <ExportLink year={year} type="expenses" label="Expenses (CSV)" />
                <ExportLink year={year} type="mileage" label="Mileage log (CSV)" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mileage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="From routes" value={`${summary.routeMiles.toLocaleString()} mi`} />
                <Row label="Manual trips" value={`${summary.manualMiles.toLocaleString()} mi`} />
                <div className="my-1 border-t border-border" />
                <Row label="Total" value={`${summary.totalMiles.toLocaleString()} mi`} bold />
                <Row
                  label={`Deduction @ ${summary.mileageRateCents}¢`}
                  value={centsToDollars(summary.mileageDeductionCents)}
                  bold
                />
                <p className="pt-1 text-xs text-muted-foreground">
                  {summary.roundTrip ? "Round-trip" : "One-way"} basis (change in Settings).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 rounded-lg border border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Bookkeeping, not tax advice.</strong>{" "}
          These figures are record-keeping estimates to help you and your accountant
          prepare your return. Mileage uses the IRS standard mileage method; if you
          instead deduct actual vehicle costs (gas, repairs, depreciation), don&apos;t
          also claim the mileage deduction. Confirm current rates and rules with a
          qualified tax professional.
        </p>
      </div>
    </div>
  );
}

function SummaryTile({
  title, value, sub, icon: Icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/8 text-brand-navy">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function ExportLink({
  year, type, label,
}: {
  year: number;
  type: "income" | "expenses" | "mileage";
  label: string;
}) {
  return (
    <a
      href={`/api/taxes/export?year=${year}&type=${type}`}
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
    >
      <Download className="h-4 w-4 text-muted-foreground" />
      {label}
    </a>
  );
}
