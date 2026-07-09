/**
 * Server Component — lists market comparables for an appraisal report.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { ComparableDeleteButton } from "./ComparableDeleteButton";
import { BarChart3 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtMileage(m: number | null): string {
  if (m == null) return "—";
  return m.toLocaleString("en-US") + " mi";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ComparablesListProps {
  reportId: string;
  /** If true, no delete buttons are shown */
  isFinalized: boolean;
}

export async function ComparablesList({
  reportId,
  isFinalized,
}: ComparablesListProps) {
  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!isConfigured) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Connect Supabase to view comparables.
        </p>
      </div>
    );
  }

  const service = await createServiceClient();

  const { data: comparables, error } = await service
    .from("market_comparables")
    .select(
      "id, year, make, model, trim, mileage, condition, sale_price_cents, source, listing_url, listing_date, notes"
    )
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ComparablesList] query error:", error.message);
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-destructive">Failed to load comparables.</p>
      </div>
    );
  }

  if (!comparables || comparables.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium">No comparables yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add market comparables to support the valuation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-3 text-xs font-semibold text-muted-foreground">
              Vehicle
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-muted-foreground">
              Mileage
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-muted-foreground">
              Condition
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-muted-foreground">
              Price
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-muted-foreground">
              Source
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-muted-foreground">
              Date
            </th>
            {!isFinalized && <th className="pb-2 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {comparables.map((comp) => (
            <tr key={comp.id} className="group">
              <td className="py-2.5 pr-3">
                <span className="font-medium">
                  {comp.year} {comp.make} {comp.model}
                </span>
                {comp.trim && (
                  <span className="ml-1 text-muted-foreground">
                    {comp.trim}
                  </span>
                )}
                {comp.notes && (
                  <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                    {comp.notes}
                  </p>
                )}
              </td>
              <td className="py-2.5 pr-3 text-sm tabular-nums">
                {fmtMileage(comp.mileage)}
              </td>
              <td className="py-2.5 pr-3 text-sm">
                {comp.condition ?? "—"}
              </td>
              <td className="py-2.5 pr-3 text-sm font-medium tabular-nums">
                {fmtCurrency(comp.sale_price_cents)}
              </td>
              <td className="py-2.5 pr-3 text-sm text-muted-foreground">
                {comp.listing_url ? (
                  <a
                    href={comp.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-navy hover:underline"
                  >
                    {comp.source ?? "Link"}
                  </a>
                ) : (
                  comp.source ?? "—"
                )}
              </td>
              <td className="py-2.5 pr-3 text-sm text-muted-foreground">
                {fmtDate(comp.listing_date)}
              </td>
              {!isFinalized && (
                <td className="py-2.5 text-right">
                  <ComparableDeleteButton comparableId={comp.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary row */}
      {comparables.length > 1 && (
        <div className="mt-3 flex justify-end border-t border-border pt-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Average:</span>{" "}
            {fmtCurrency(
              Math.round(
                comparables.reduce((sum, c) => sum + c.sale_price_cents, 0) /
                  comparables.length
              )
            )}
            {" · "}
            <span className="font-medium">Median:</span>{" "}
            {fmtCurrency(
              (() => {
                const sorted = [...comparables]
                  .map((c) => c.sale_price_cents)
                  .sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0
                  ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
                  : sorted[mid];
              })()
            )}
          </p>
        </div>
      )}
    </div>
  );
}
