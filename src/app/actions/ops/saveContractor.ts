"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

const SaveContractorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, { message: "Contractor name is required." }).max(200),
  contact_name: z.string().max(200).optional(),
  contact_email: z
    .string()
    .email({ message: "Must be a valid email address." })
    .optional()
    .or(z.literal("")),
  contact_phone: z.string().max(40).optional(),
  default_duration_minutes: z.coerce
    .number()
    .int()
    .positive({ message: "Default duration must be greater than 0 minutes." })
    .optional(),
  default_notes: z.string().max(2000).optional(),
  active: z.coerce.boolean().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveContractorResult {
  success: boolean;
  contractorId?: string;
  error?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Create or update a contractor. Uses the anon client — RLS restricts
 * writes to owner_admin.
 */
export async function saveContractor(
  _prev: SaveContractorResult | null,
  formData: FormData
): Promise<SaveContractorResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  const raw: Record<string, unknown> = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v])
  );
  // Unchecked checkboxes are absent from FormData — treat as false on edit
  raw.active = formData.get("active") === "on" || formData.get("active") === "true";

  const parsed = SaveContractorSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const { id, ...fields } = parsed.data;

  const row = {
    name: fields.name.trim(),
    contact_name: fields.contact_name?.trim() || null,
    contact_email: fields.contact_email || null,
    contact_phone: fields.contact_phone?.trim() || null,
    default_duration_minutes: fields.default_duration_minutes ?? null,
    default_notes: fields.default_notes?.trim() || null,
    active: fields.active ?? true,
  };

  if (id) {
    const { error } = await supabase.from("contractors").update(row).eq("id", id);
    if (error) {
      console.error("[saveContractor] update error:", error.message);
      return {
        success: false,
        error:
          error.code === "23505"
            ? "A contractor with this name already exists."
            : "Failed to update contractor.",
      };
    }
    revalidatePath("/admin/contractors");
    revalidatePath(`/admin/contractors/${id}`);
    return { success: true, contractorId: id };
  }

  const { data: created, error } = await supabase
    .from("contractors")
    .insert(row)
    .select("id")
    .single();

  if (error || !created) {
    console.error("[saveContractor] insert error:", error?.message);
    return {
      success: false,
      error:
        error?.code === "23505"
          ? "A contractor with this name already exists."
          : "Failed to create contractor.",
    };
  }

  revalidatePath("/admin/contractors");
  return { success: true, contractorId: created.id };
}
