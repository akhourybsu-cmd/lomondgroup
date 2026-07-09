import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppointmentForm } from "@/components/ops/AppointmentForm";
import { createClient } from "@/lib/supabase/server";
import type { Appointment } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return { title: "Edit Appointment — Lomond Appraisal Admin" };
}

export default async function EditAppointmentPage({ params }: PageProps) {
  const { id } = await params;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured) notFound();

  const supabase = await createClient();
  const [{ data: appointment }, { data: contractors }] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", id).single(),
    supabase
      .from("contractors")
      .select("id, name, default_duration_minutes")
      .eq("active", true)
      .order("name"),
  ]);

  if (!appointment) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader
        breadcrumbs={[
          { label: "Appointments", href: "/admin/appointments" },
          {
            label: appointment.customer_name ?? "Appointment",
            href: `/admin/appointments/${id}`,
          },
          { label: "Edit" },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-xl font-semibold tracking-tight">
            Edit Appointment
          </h1>
          <AppointmentForm
            contractors={contractors ?? []}
            appointment={appointment as Appointment}
          />
        </div>
      </div>
    </div>
  );
}
