"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface DeleteResult {
  success: boolean;
  error?: string;
}

type TaxTable = "income_entries" | "business_expenses" | "mileage_entries";

const REVALIDATE: Record<TaxTable, string> = {
  income_entries: "/admin/taxes/income",
  business_expenses: "/admin/taxes/expenses",
  mileage_entries: "/admin/taxes/mileage",
};

/**
 * Delete an income entry, expense, or manual mileage entry. For
 * expenses, the receipt file (if any) is removed from storage too.
 */
export async function deleteTaxRecord(
  table: TaxTable,
  id: string
): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  if (table === "business_expenses") {
    const { data: expense } = await supabase
      .from("business_expenses")
      .select("receipt_storage_path")
      .eq("id", id)
      .single();
    if (expense?.receipt_storage_path) {
      const service = await createServiceClient();
      await service.storage.from("tax-receipts").remove([expense.receipt_storage_path]);
    }
  }

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`[deleteTaxRecord] ${table}:`, error.message);
    return { success: false, error: "Failed to delete the record." };
  }

  revalidatePath("/admin/taxes");
  revalidatePath(REVALIDATE[table]);
  return { success: true };
}
