"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

const AddComparableSchema = z.object({
  report_id: z.string().uuid(),
  year: z.coerce
    .number()
    .int()
    .min(1900, { message: "Year must be 1900 or later." })
    .max(new Date().getFullYear() + 2, { message: "Year is too far in the future." }),
  make: z.string().min(1, { message: "Make is required." }),
  model: z.string().min(1, { message: "Model is required." }),
  trim: z.string().optional(),
  mileage: z.coerce.number().int().nonnegative().optional().nullable(),
  condition: z.string().optional(),
  sale_price_dollars: z.coerce
    .number()
    .nonnegative({ message: "Price must be 0 or greater." }),
  source: z.string().optional(),
  listing_url: z
    .string()
    .url({ message: "Must be a valid URL." })
    .optional()
    .or(z.literal("")),
  listing_date: z.string().optional(),
  notes: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddComparableResult {
  success: boolean;
  error?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function addComparable(
  _prev: AddComparableResult | null,
  formData: FormData
): Promise<AddComparableResult> {
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
  const raw = Object.fromEntries(
    [...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v])
  );

  const parsed = AddComparableSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid data.",
    };
  }

  const {
    report_id,
    sale_price_dollars,
    listing_url,
    listing_date,
    ...rest
  } = parsed.data;

  // ── Verify report → job access ──────────────────────────────────────────────
  const service = await createServiceClient();

  const { data: report } = await service
    .from("appraisal_reports")
    .select("id, job_id, is_draft")
    .eq("id", report_id)
    .single();

  if (!report) {
    return { success: false, error: "Report not found." };
  }
  if (!report.is_draft) {
    return { success: false, error: "Cannot add comparables to a finalized report." };
  }

  // Verify job access via RLS (anon client — respects RLS)
  const { error: jobError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", report.job_id)
    .single();

  if (jobError) {
    return { success: false, error: "Access denied." };
  }

  // ── Insert ──────────────────────────────────────────────────────────────────
  const { error: insertError } = await service.from("market_comparables").insert({
    report_id,
    year: rest.year,
    make: rest.make,
    model: rest.model,
    trim: rest.trim ?? null,
    mileage: rest.mileage ?? null,
    condition: rest.condition ?? null,
    sale_price_cents: Math.round(sale_price_dollars * 100),
    source: rest.source ?? null,
    listing_url: listing_url || null,
    listing_date: listing_date || null,
    notes: rest.notes ?? null,
  });

  if (insertError) {
    console.error("[addComparable] insert error:", insertError.message);
    return { success: false, error: "Failed to add comparable." };
  }

  revalidatePath(`/admin/jobs/${report.job_id}`);
  return { success: true };
}
