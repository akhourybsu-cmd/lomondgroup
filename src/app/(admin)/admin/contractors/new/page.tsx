import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ContractorForm } from "@/components/ops/ContractorForm";

export const metadata: Metadata = {
  title: "New Contractor — Lomond Appraisal Admin",
};

export default function NewContractorPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Contractors", href: "/admin/contractors" },
          { label: "New" },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-6 text-xl font-semibold tracking-tight">
            New Contractor
          </h1>
          <Card>
            <CardContent className="pt-6">
              <ContractorForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
