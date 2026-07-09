import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings — Lomond Appraisal Admin",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Settings" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Account and application settings
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed border-border bg-secondary/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Account settings — Phase 3
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
