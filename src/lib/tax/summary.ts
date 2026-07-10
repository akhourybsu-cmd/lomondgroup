/**
 * Tax year summary — aggregates income, expenses, and mileage for a
 * calendar year. Mileage combines route-derived miles (auto) with
 * manual trip entries. Server-only (queries the DB).
 *
 * Bookkeeping, not tax advice — figures are estimates for handing to
 * an accountant.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CategoryBreakdown,
  type ExpenseCategory,
  type RouteMileageLine,
  type TaxYearSummary,
} from "@/lib/types/tax";

function yearBounds(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Round to 1 decimal for miles. */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function getMileageRate(
  client: SupabaseClient,
  year: number
): Promise<{ cents: number; isFallback: boolean }> {
  const { data } = await client
    .from("tax_mileage_rates")
    .select("year, cents_per_mile")
    .lte("year", year)
    .order("year", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return { cents: 0, isFallback: true };
  return { cents: row.cents_per_mile, isFallback: row.year !== year };
}

export async function getRouteMileageLines(
  client: SupabaseClient,
  year: number,
  roundTrip: boolean
): Promise<RouteMileageLine[]> {
  const { start, end } = yearBounds(year);
  const { data } = await client
    .from("daily_routes")
    .select(
      "id, route_date, total_miles, return_to_start_miles, route_stops(count)"
    )
    .gte("route_date", start)
    .lte("route_date", end)
    .neq("route_status", "archived")
    .order("route_date");

  return (data ?? []).map((r) => {
    const oneWay = r.total_miles ?? 0;
    const ret = r.return_to_start_miles ?? 0;
    return {
      routeId: r.id,
      routeDate: r.route_date,
      stops:
        (r.route_stops as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      oneWayMiles: r1(oneWay),
      returnMiles: r1(ret),
      countedMiles: r1(roundTrip ? oneWay + ret : oneWay),
    };
  });
}

export async function getTaxYearSummary(
  client: SupabaseClient,
  year: number
): Promise<TaxYearSummary> {
  const { start, end } = yearBounds(year);

  const [
    { data: settingsRow },
    { data: income },
    { data: expenses },
    { data: manualMileage },
  ] = await Promise.all([
    client.from("tax_settings").select("mileage_round_trip").limit(1).single(),
    client
      .from("income_entries")
      .select("amount_cents")
      .gte("income_date", start)
      .lte("income_date", end),
    client
      .from("business_expenses")
      .select("category, amount_cents, deductible_percent")
      .gte("expense_date", start)
      .lte("expense_date", end),
    client
      .from("mileage_entries")
      .select("miles")
      .gte("trip_date", start)
      .lte("trip_date", end),
  ]);

  const roundTrip = settingsRow?.mileage_round_trip ?? true;

  // Income
  const incomeCents = (income ?? []).reduce((s, r) => s + r.amount_cents, 0);
  const incomeCount = (income ?? []).length;

  // Expenses (grouped)
  const byCat = new Map<ExpenseCategory, CategoryBreakdown>();
  let expenseTotalCents = 0;
  let expenseDeductibleCents = 0;
  for (const e of expenses ?? []) {
    const deductible = Math.round((e.amount_cents * e.deductible_percent) / 100);
    expenseTotalCents += e.amount_cents;
    expenseDeductibleCents += deductible;
    const entry =
      byCat.get(e.category as ExpenseCategory) ??
      {
        category: e.category as ExpenseCategory,
        totalCents: 0,
        deductibleCents: 0,
        count: 0,
      };
    entry.totalCents += e.amount_cents;
    entry.deductibleCents += deductible;
    entry.count += 1;
    byCat.set(e.category as ExpenseCategory, entry);
  }
  const expenseByCategory = [...byCat.values()].sort(
    (a, b) => b.deductibleCents - a.deductibleCents
  );

  // Mileage
  const routeLines = await getRouteMileageLines(client, year, roundTrip);
  const routeMiles = r1(routeLines.reduce((s, l) => s + l.countedMiles, 0));
  const manualMiles = r1((manualMileage ?? []).reduce((s, m) => s + m.miles, 0));
  const totalMiles = r1(routeMiles + manualMiles);

  const { cents: mileageRateCents, isFallback: mileageRateIsFallback } =
    await getMileageRate(client, year);
  const mileageDeductionCents = Math.round(totalMiles * mileageRateCents);

  const netCents =
    incomeCents - expenseDeductibleCents - mileageDeductionCents;

  return {
    year,
    incomeCents,
    incomeCount,
    expenseTotalCents,
    expenseDeductibleCents,
    expenseByCategory,
    routeMiles,
    manualMiles,
    totalMiles,
    mileageRateCents,
    mileageRateIsFallback,
    mileageDeductionCents,
    netCents,
    roundTrip,
  };
}

/** Distinct years that have any tax data, plus the current year. */
export async function getYearsWithData(
  client: SupabaseClient,
  currentYear: number
): Promise<number[]> {
  const [{ data: inc }, { data: exp }, { data: routes }] = await Promise.all([
    client.from("income_entries").select("income_date"),
    client.from("business_expenses").select("expense_date"),
    client.from("daily_routes").select("route_date").neq("route_status", "archived"),
  ]);
  const years = new Set<number>([currentYear]);
  for (const r of inc ?? []) years.add(Number(r.income_date.slice(0, 4)));
  for (const r of exp ?? []) years.add(Number(r.expense_date.slice(0, 4)));
  for (const r of routes ?? []) years.add(Number(r.route_date.slice(0, 4)));
  return [...years].sort((a, b) => b - a);
}
