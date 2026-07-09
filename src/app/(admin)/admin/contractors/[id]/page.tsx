import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ContractorForm } from "@/components/ops/ContractorForm";
import { createClient } from "@/lib/supabase/server";
import type { Contractor } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return { title: "Edit Contractor — Lomond Appraisal Admin" };
}

export default async function EditContractorPage({ params }: PageProps) {
  const { id } = await params;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const { data: contractor } = await supabase
    .from("contractors")
    .select("*")
    .eq("id", id)
    .single();

  if (!contractor) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Contractors", href: "/admin/contractors" },
          { label: contractor.name },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-6 text-xl font-semibold tracking-tight">
            Edit Contractor
          </h1>
          <Card>
            <CardContent className="pt-6">
              <ContractorForm contractor={contractor as Contractor} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
