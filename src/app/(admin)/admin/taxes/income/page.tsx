import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TaxTabs } from "@/components/tax/TaxTabs";
import { YearSelector } from "@/components/tax/YearSelector";
import { IncomeManager } from "@/components/tax/IncomeManager";
import { createClient } from "@/lib/supabase/server";
import { getYearsWithData } from "@/lib/tax/summary";
import type { Contractor, IncomeEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Income — Lomond Appraisal Admin" };

const CURRENT_YEAR = 2026;

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

type IncomeRow = IncomeEntry & { contractor: Pick<Contractor, "id" | "name"> | null };

export default async function TaxIncomePage({ searchParams }: PageProps) {
  const { year: rawYear } = await searchParams;
  const y = Number(rawYear);
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : CURRENT_YEAR;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const [{ data: income }, { data: contractors }, years] = await Promise.all([
    supabase
      .from("income_entries")
      .select("*, contractor:contractors(id, name)")
      .gte("income_date", `${year}-01-01`)
      .lte("income_date", `${year}-12-31`)
      .order("income_date", { ascending: false }),
    supabase.from("contractors").select("id, name").order("name"),
    getYearsWithData(supabase, CURRENT_YEAR),
  ]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[{ label: "Taxes", href: "/admin/taxes" }, { label: "Income" }]}
      />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Income</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Fees and payments received in {year}.
            </p>
          </div>
          <YearSelector years={years} current={year} />
        </div>
        <TaxTabs year={year} />
        <IncomeManager
          income={(income ?? []) as unknown as IncomeRow[]}
          contractors={contractors ?? []}
        />
      </div>
    </div>
  );
}
