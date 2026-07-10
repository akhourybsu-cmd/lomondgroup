"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface GetReceiptUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

/** Short-lived signed URL for an expense receipt (owner-only via RLS). */
export async function getReceiptUrl(
  expenseId: string
): Promise<GetReceiptUrlResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { data: expense } = await supabase
    .from("business_expenses")
    .select("receipt_storage_path")
    .eq("id", expenseId)
    .single();
  if (!expense?.receipt_storage_path) {
    return { success: false, error: "No receipt on file." };
  }

  const service = await createServiceClient();
  const { data, error } = await service.storage
    .from("tax-receipts")
    .createSignedUrl(expense.receipt_storage_path, 600);
  if (error || !data) {
    return { success: false, error: "Could not open the receipt." };
  }
  return { success: true, url: data.signedUrl };
}
