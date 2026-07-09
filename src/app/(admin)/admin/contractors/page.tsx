import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Building2, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Contractors — Lomond Appraisal Admin",
};

type ContractorRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  default_duration_minutes: number | null;
  active: boolean;
  appointments: { count: number }[];
};

export default async function ContractorsPage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let contractors: ContractorRow[] = [];

  if (isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contractors")
      .select(
        "id, name, contact_name, contact_email, contact_phone, default_duration_minutes, active, appointments(count)"
      )
      .order("name");
    if (data) contractors = data as unknown as ContractorRow[];
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Contractors" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Contractors</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Assignment sources that send appraisal appointments.
            </p>
          </div>
          <Button
            render={<Link href="/admin/contractors/new" />}
            nativeButton={false}
            className="bg-brand-navy text-white hover:bg-brand-navy-dark"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Contractor
          </Button>
        </div>

        {contractors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-foreground">No contractors yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isConfigured
                    ? "Add the companies that send you appraisal assignments."
                    : "Connect Supabase to see live data."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Default Duration
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Appointments
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contractors.map((c) => (
                    <tr
                      key={c.id}
                      className="group transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/contractors/${c.id}`}
                          className="font-medium text-brand-navy hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {c.contact_name ? (
                          <div>
                            <p>{c.contact_name}</p>
                            {c.contact_email && (
                              <p className="text-xs text-muted-foreground">
                                {c.contact_email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {c.contact_email ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.contact_phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.default_duration_minutes
                          ? `${c.default_duration_minutes} min`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.appointments?.[0]?.count ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            c.active
                              ? "inline-flex rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700"
                              : "inline-flex rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {c.active ? "Active" : "Inactive"}
                        </span>
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
