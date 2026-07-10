"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SaveMileageSchema = z.object({
  id: z.string().uuid().optional(),
  trip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Pick a valid date." }),
  miles: z.coerce.number().positive({ message: "Miles must be greater than 0." }),
  purpose: z.string().min(1, { message: "Describe the trip's purpose." }).max(300),
  from_location: z.string().max(300).optional(),
  to_location: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});

export interface SaveMileageResult {
  success: boolean;
  error?: string;
}

export async function saveMileageEntry(
  _prev: SaveMileageResult | null,
  formData: FormData
): Promise<SaveMileageResult> {
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
  const parsed = SaveMileageSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const f = parsed.data;

  const row = {
    trip_date: f.trip_date,
    miles: Math.round(f.miles * 10) / 10,
    purpose: f.purpose.trim(),
    from_location: f.from_location?.trim() || null,
    to_location: f.to_location?.trim() || null,
    notes: f.notes?.trim() || null,
  };

  if (f.id) {
    const { error } = await supabase.from("mileage_entries").update(row).eq("id", f.id);
    if (error) {
      console.error("[saveMileageEntry] update:", error.message);
      return { success: false, error: "Failed to update the trip." };
    }
  } else {
    const { data: created, error } = await supabase
      .from("mileage_entries")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[saveMileageEntry] insert:", error?.message);
      return { success: false, error: "Failed to save the trip." };
    }
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      event_type: "tax_mileage_recorded",
      metadata: { mileage_id: created.id, miles: row.miles },
    });
  }

  revalidatePath("/admin/taxes");
  revalidatePath("/admin/taxes/mileage");
  return { success: true };
}
