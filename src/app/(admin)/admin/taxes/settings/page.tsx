import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TaxTabs } from "@/components/tax/TaxTabs";
import { TaxSettingsForm } from "@/components/tax/TaxSettingsForm";
import { MileageRatesEditor } from "@/components/tax/MileageRatesEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { MileageRate, TaxSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Tax Settings — Lomond Appraisal Admin" };

const CURRENT_YEAR = 2026;

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function TaxSettingsPage({ searchParams }: PageProps) {
  const { year: rawYear } = await searchParams;
  const y = Number(rawYear);
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : CURRENT_YEAR;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const [{ data: settings }, { data: rates }] = await Promise.all([
    supabase.from("tax_settings").select("*").limit(1).single(),
    supabase
      .from("tax_mileage_rates")
      .select("*")
      .order("year", { ascending: false }),
  ]);

  if (!settings) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[{ label: "Taxes", href: "/admin/taxes" }, { label: "Settings" }]}
      />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Tax Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Business details, mileage method, and the IRS standard mileage rate.
          </p>
        </div>
        <TaxTabs year={year} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              <TaxSettingsForm settings={settings as TaxSettings} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">IRS Mileage Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <MileageRatesEditor
                rates={(rates ?? []) as MileageRate[]}
                currentYear={CURRENT_YEAR}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
