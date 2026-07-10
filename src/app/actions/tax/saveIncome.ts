"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dollarsToCents } from "@/lib/types/tax";
import { z } from "zod";

const SaveIncomeSchema = z.object({
  id: z.string().uuid().optional(),
  income_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Pick a valid date." }),
  amount_dollars: z.string().min(1, { message: "Enter an amount." }),
  source: z.string().max(200).optional(),
  contractor_id: z.string().uuid().optional(),
  description: z.string().max(300).optional(),
  payment_method: z.string().max(40).optional(),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export interface SaveIncomeResult {
  success: boolean;
  error?: string;
}

export async function saveIncome(
  _prev: SaveIncomeResult | null,
  formData: FormData
): Promise<SaveIncomeResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const raw = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v])
  );
  const parsed = SaveIncomeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const f = parsed.data;

  const amountCents = dollarsToCents(f.amount_dollars);
  if (amountCents === null || amountCents < 0) {
    return { success: false, error: "Enter a valid dollar amount." };
  }

  const row = {
    income_date: f.income_date,
    amount_cents: amountCents,
    source: f.source?.trim() || null,
    contractor_id: f.contractor_id ?? null,
    description: f.description?.trim() || null,
    payment_method: f.payment_method || null,
    reference_number: f.reference_number?.trim() || null,
    notes: f.notes?.trim() || null,
  };

  if (f.id) {
    const { error } = await supabase.from("income_entries").update(row).eq("id", f.id);
    if (error) {
      console.error("[saveIncome] update:", error.message);
      return { success: false, error: "Failed to update the income entry." };
    }
  } else {
    const { data: created, error } = await supabase
      .from("income_entries")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[saveIncome] insert:", error?.message);
      return { success: false, error: "Failed to save the income entry." };
    }
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      event_type: "tax_income_recorded",
      metadata: { income_id: created.id, amount_cents: amountCents },
    });
  }

  revalidatePath("/admin/taxes");
  revalidatePath("/admin/taxes/income");
  return { success: true };
}
