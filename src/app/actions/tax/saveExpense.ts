"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { dollarsToCents } from "@/lib/types/tax";
import { z } from "zod";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const SaveExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Pick a valid date.",
  }),
  category: z.enum([
    "advertising", "car_truck", "commissions_fees", "contract_labor",
    "depreciation", "insurance", "legal_professional", "office_expense",
    "rent_lease", "repairs_maintenance", "supplies", "taxes_licenses",
    "travel", "meals", "utilities", "phone", "software_subscriptions",
    "education", "bank_fees", "home_office", "other",
  ]),
  description: z.string().min(1, { message: "Add a description." }).max(300),
  amount_dollars: z.string().min(1, { message: "Enter an amount." }),
  deductible_percent: z.coerce.number().int().min(0).max(100),
  vendor: z.string().max(200).optional(),
  payment_method: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export interface SaveExpenseResult {
  success: boolean;
  error?: string;
}

export async function saveExpense(
  _prev: SaveExpenseResult | null,
  formData: FormData
): Promise<SaveExpenseResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const raw = Object.fromEntries(
    [...formData.entries()]
      .filter(([k]) => k !== "receipt")
      .map(([k, v]) => [k, v === "" ? undefined : v])
  );
  const parsed = SaveExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const f = parsed.data;

  const amountCents = dollarsToCents(f.amount_dollars);
  if (amountCents === null || amountCents < 0) {
    return { success: false, error: "Enter a valid dollar amount." };
  }

  const row = {
    expense_date: f.expense_date,
    category: f.category,
    description: f.description.trim(),
    amount_cents: amountCents,
    deductible_percent: f.deductible_percent,
    vendor: f.vendor?.trim() || null,
    payment_method: f.payment_method || null,
    notes: f.notes?.trim() || null,
  };

  const id = f.id ?? randomUUID();

  if (f.id) {
    const { error } = await supabase
      .from("business_expenses")
      .update(row)
      .eq("id", f.id);
    if (error) {
      console.error("[saveExpense] update:", error.message);
      return { success: false, error: "Failed to update the expense." };
    }
  } else {
    const { error } = await supabase
      .from("business_expenses")
      .insert({ ...row, id, created_by: user.id });
    if (error) {
      console.error("[saveExpense] insert:", error.message);
      return { success: false, error: "Failed to save the expense." };
    }
  }

  // Optional receipt upload (image or PDF)
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return { success: false, error: "Expense saved, but the receipt is larger than 10 MB." };
    }
    const service = await createServiceClient();
    const safeName = receipt.name.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
    const path = `${id}/${safeName}`;
    const { error: upErr } = await service.storage
      .from("tax-receipts")
      .upload(path, Buffer.from(await receipt.arrayBuffer()), {
        contentType: receipt.type || "application/octet-stream",
        upsert: true,
      });
    if (upErr) {
      console.error("[saveExpense] receipt upload:", upErr.message);
      return { success: false, error: "Expense saved, but the receipt upload failed." };
    }
    await supabase
      .from("business_expenses")
      .update({ receipt_storage_path: path })
      .eq("id", id);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    event_type: "tax_expense_recorded",
    metadata: { expense_id: id, category: f.category, amount_cents: amountCents },
  });

  revalidatePath("/admin/taxes");
  revalidatePath("/admin/taxes/expenses");
  return { success: true };
}
