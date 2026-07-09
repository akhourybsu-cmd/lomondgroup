import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentForm } from "@/components/ops/AppointmentForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "New Appointment — Lomond Appraisal Admin",
};

export default async function NewAppointmentPage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let contractors: {
    id: string;
    name: string;
    default_duration_minutes: number | null;
  }[] = [];

  if (isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("contractors")
      .select("id, name, default_duration_minutes")
      .eq("active", true)
      .order("name");
    if (data) contractors = data;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Appointments", href: "/admin/appointments" },
          { label: "New" },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-xl font-semibold tracking-tight">
            New Appointment
          </h1>
          <AppointmentForm contractors={contractors} />
        </div>
      </div>
    </div>
  );
}
