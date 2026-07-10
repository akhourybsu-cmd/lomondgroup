"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SettingsSchema = z.object({
  business_name: z.string().max(200).optional(),
  entity_type: z
    .enum([
      "sole_prop", "single_member_llc", "multi_member_llc",
      "s_corp", "c_corp", "other",
    ])
    .optional(),
  ein: z.string().max(20).optional(),
  state: z.string().max(2).optional(),
  mileage_round_trip: z.coerce.boolean().optional(),
});

export interface UpdateTaxSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateTaxSettings(
  _prev: UpdateTaxSettingsResult | null,
  formData: FormData
): Promise<UpdateTaxSettingsResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const raw: Record<string, unknown> = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v])
  );
  raw.mileage_round_trip =
    formData.get("mileage_round_trip") === "on" ||
    formData.get("mileage_round_trip") === "true";

  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const f = parsed.data;

  const { error } = await supabase
    .from("tax_settings")
    .update({
      business_name: f.business_name?.trim() || null,
      entity_type: f.entity_type ?? null,
      ein: f.ein?.trim() || null,
      state: (f.state?.trim() || "MA").toUpperCase(),
      mileage_round_trip: f.mileage_round_trip ?? true,
    })
    .eq("id", true);
  if (error) {
    console.error("[updateTaxSettings]:", error.message);
    return { success: false, error: "Failed to save settings." };
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    event_type: "tax_settings_updated",
    metadata: { round_trip: f.mileage_round_trip },
  });

  revalidatePath("/admin/taxes");
  revalidatePath("/admin/taxes/settings");
  return { success: true };
}
