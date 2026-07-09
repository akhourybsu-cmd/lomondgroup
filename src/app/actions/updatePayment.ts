"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { PaymentStatus } from "@/lib/types";

// ── Schema ────────────────────────────────────────────────────────────────────

const UpdatePaymentSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum([
    "unpaid",
    "invoiced",
    "partial",
    "paid",
    "refunded",
    "waived",
  ]),
  amount_dollars: z.coerce.number().nonnegative().optional().nullable(),
  method: z.string().optional(),
  notes: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UpdatePaymentResult {
  success: boolean;
  error?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function updatePayment(
  _prev: UpdatePaymentResult | null,
  formData: FormData
): Promise<UpdatePaymentResult> {
  // ── Dev bypass ──────────────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  // ── Validate ────────────────────────────────────────────────────────────────
  const raw = {
    job_id: formData.get("job_id") as string,
    status: formData.get("status") as string,
    amount_dollars: (formData.get("amount_dollars") as string) || undefined,
    method: (formData.get("method") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = UpdatePaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const { job_id, status, amount_dollars, method, notes } = parsed.data;

  // ── Job access via RLS ──────────────────────────────────────────────────────
  const { error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", job_id)
    .single();

  if (jobError) {
    return { success: false, error: "Job not found or access denied." };
  }

  const amount_cents =
    amount_dollars != null ? Math.round(amount_dollars * 100) : null;

  // Auto-set paid_at when marking as paid
  const paid_at =
    status === "paid" ? new Date().toISOString() : null;

  const service = await createServiceClient();

  // ── Fetch existing to check if paid_at is already set ──────────────────────
  const { data: existing } = await service
    .from("payments")
    .select("id, status, paid_at")
    .eq("job_id", job_id)
    .single();

  // Preserve existing paid_at if already set (don't overwrite on re-save)
  const finalPaidAt =
    status === "paid"
      ? existing?.paid_at ?? paid_at
      : paid_at; // null for non-paid statuses

  // ── Upsert payment record ───────────────────────────────────────────────────
  const { error: upsertError } = await service.from("payments").upsert(
    {
      job_id,
      status: status as PaymentStatus,
      amount_cents,
      paid_at: finalPaidAt,
      method: method ?? null,
      notes: notes ?? null,
    },
    { onConflict: "job_id" }
  );

  if (upsertError) {
    console.error("[updatePayment] upsert error:", upsertError.message);
    return { success: false, error: "Failed to update payment." };
  }

  // ── Audit log ───────────────────────────────────────────────────────────────
  await service.from("audit_logs").insert({
    job_id,
    actor_id: user.id,
    event_type: "payment_updated",
    metadata: {
      status,
      amount_cents,
      method: method ?? null,
      previous_status: existing?.status ?? null,
    },
  });

  revalidatePath(`/admin/jobs/${job_id}`);
  return { success: true };
}
