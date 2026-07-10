import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TaxTabs } from "@/components/tax/TaxTabs";
import { YearSelector } from "@/components/tax/YearSelector";
import { MileageManager } from "@/components/tax/MileageManager";
import { createClient } from "@/lib/supabase/server";
import { getRouteMileageLines, getYearsWithData } from "@/lib/tax/summary";
import type { MileageEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Mileage — Lomond Appraisal Admin" };

const CURRENT_YEAR = 2026;

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function TaxMileagePage({ searchParams }: PageProps) {
  const { year: rawYear } = await searchParams;
  const y = Number(rawYear);
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : CURRENT_YEAR;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("tax_settings")
    .select("mileage_round_trip")
    .limit(1)
    .single();
  const roundTrip = settings?.mileage_round_trip ?? true;

  const [routeLines, { data: manual }, years] = await Promise.all([
    getRouteMileageLines(supabase, year, roundTrip),
    supabase
      .from("mileage_entries")
      .select("*")
      .gte("trip_date", `${year}-01-01`)
      .lte("trip_date", `${year}-12-31`)
      .order("trip_date", { ascending: false }),
    getYearsWithData(supabase, CURRENT_YEAR),
  ]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[{ label: "Taxes", href: "/admin/taxes" }, { label: "Mileage" }]}
      />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Mileage</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Business miles for {year} — pulled from your routes, plus any manual trips.
            </p>
          </div>
          <YearSelector years={years} current={year} />
        </div>
        <TaxTabs year={year} />
        <MileageManager
          routeLines={routeLines}
          manualEntries={(manual ?? []) as MileageEntry[]}
          roundTrip={roundTrip}
        />
      </div>
    </div>
  );
}
