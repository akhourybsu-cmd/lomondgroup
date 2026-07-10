import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EXPENSE_CATEGORY_CONFIG,
  type ExpenseCategory,
} from "@/lib/types/tax";
import { getRouteMileageLines } from "@/lib/tax/summary";

/**
 * CSV export for a tax year: ?year=YYYY&type=income|expenses|mileage
 * One CSV per section for a clean accountant hand-off. Owner-only.
 */

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const type = url.searchParams.get("type");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  let rows: (string | number | null)[][];
  let filename: string;

  if (type === "income") {
    const { data } = await supabase
      .from("income_entries")
      .select("income_date, amount_cents, source, description, payment_method, reference_number, contractor:contractors(name)")
      .gte("income_date", start)
      .lte("income_date", end)
      .order("income_date");
    rows = [
      ["Date", "Amount (USD)", "Source", "Contractor", "Description", "Method", "Reference"],
      ...(data ?? []).map((r) => [
        r.income_date,
        dollars(r.amount_cents),
        r.source,
        (r.contractor as unknown as { name: string } | null)?.name ?? "",
        r.description,
        r.payment_method,
        r.reference_number,
      ]),
    ];
    filename = `income-${year}.csv`;
  } else if (type === "expenses") {
    const { data } = await supabase
      .from("business_expenses")
      .select("expense_date, category, description, amount_cents, deductible_percent, vendor, payment_method")
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date");
    rows = [
      ["Date", "Category", "Schedule C", "Description", "Amount (USD)", "Deductible %", "Deductible (USD)", "Vendor", "Method"],
      ...(data ?? []).map((r) => {
        const cfg = EXPENSE_CATEGORY_CONFIG[r.category as ExpenseCategory];
        return [
          r.expense_date,
          cfg.label,
          cfg.scheduleC,
          r.description,
          dollars(r.amount_cents),
          r.deductible_percent,
          dollars(Math.round((r.amount_cents * r.deductible_percent) / 100)),
          r.vendor,
          r.payment_method,
        ];
      }),
    ];
    filename = `expenses-${year}.csv`;
  } else if (type === "mileage") {
    const { data: settings } = await supabase
      .from("tax_settings")
      .select("mileage_round_trip")
      .limit(1)
      .single();
    const roundTrip = settings?.mileage_round_trip ?? true;
    const routeLines = await getRouteMileageLines(supabase, year, roundTrip);
    const { data: manual } = await supabase
      .from("mileage_entries")
      .select("trip_date, miles, purpose, from_location, to_location")
      .gte("trip_date", start)
      .lte("trip_date", end)
      .order("trip_date");
    rows = [
      ["Date", "Source", "Miles", "Detail"],
      ...routeLines.map((l) => [
        l.routeDate,
        "Route",
        l.countedMiles,
        `${l.stops} stops${roundTrip ? " (round-trip)" : " (one-way)"}`,
      ]),
      ...(manual ?? []).map((m) => [
        m.trip_date,
        "Manual",
        m.miles,
        [m.purpose, m.from_location && m.to_location ? `${m.from_location} → ${m.to_location}` : ""]
          .filter(Boolean)
          .join(" — "),
      ]),
    ];
    filename = `mileage-${year}.csv`;
  } else {
    return NextResponse.json(
      { error: "type must be income, expenses, or mileage." },
      { status: 400 }
    );
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
