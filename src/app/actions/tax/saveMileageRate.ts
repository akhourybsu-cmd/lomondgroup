"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const RateSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  cents_per_mile: z.coerce
    .number()
    .positive({ message: "Rate must be greater than 0." })
    .max(500, { message: "That rate looks too high — enter cents per mile." }),
});

export interface SaveMileageRateResult {
  success: boolean;
  error?: string;
}

/** Upsert the IRS standard mileage rate (cents/mile) for a given year. */
export async function saveMileageRate(
  _prev: SaveMileageRateResult | null,
  formData: FormData
): Promise<SaveMileageRateResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const parsed = RateSchema.safeParse(
    Object.fromEntries(formData.entries())
  );
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid rate." };
  }

  const { error } = await supabase
    .from("tax_mileage_rates")
    .upsert(
      { year: parsed.data.year, cents_per_mile: Math.round(parsed.data.cents_per_mile) },
      { onConflict: "year" }
    );
  if (error) {
    console.error("[saveMileageRate]:", error.message);
    return { success: false, error: "Failed to save the rate." };
  }

  revalidatePath("/admin/taxes");
  revalidatePath("/admin/taxes/settings");
  return { success: true };
}
