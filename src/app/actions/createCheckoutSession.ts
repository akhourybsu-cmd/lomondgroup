"use server";

import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateCheckoutSessionResult {
  success: boolean;
  error?: string;
  url?: string;
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  jobId: string
): Promise<CreateCheckoutSessionResult> {
  // ── Dev / config bypass ─────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }
  if (!isStripeConfigured()) {
    return { success: false, error: "Stripe is not configured." };
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

  const service = await createServiceClient();

  // ── Fetch job + client + existing payment ───────────────────────────────────
  const { data: job, error: jobError } = await service
    .from("appraisal_jobs")
    .select(
      `
      id, internal_ref, appraisal_type, quoted_fee_cents,
      client:clients(first_name, last_name, email)
    `
    )
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job not found." };
  }

  // Verify requesting user has access via RLS
  const { error: accessError } = await supabase
    .from("appraisal_jobs")
    .select("id")
    .eq("id", jobId)
    .single();

  if (accessError) {
    return { success: false, error: "Access denied." };
  }

  // Resolve existing payment record for the amount
  const { data: existingPayment } = await service
    .from("payments")
    .select("id, amount_cents, stripe_checkout_session_id")
    .eq("job_id", jobId)
    .single();

  // Amount: use payment record amount if set, else fall back to quoted_fee_cents
  const amountCents =
    existingPayment?.amount_cents ?? job.quoted_fee_cents ?? null;

  if (!amountCents || amountCents <= 0) {
    return {
      success: false,
      error:
        "No fee amount is set. Add an amount in the payment record before generating a checkout link.",
    };
  }

  // Resolve client email
  const clientRaw = Array.isArray(job.client)
    ? (job.client[0] as { first_name: string; last_name: string; email: string } | undefined)
    : (job.client as { first_name: string; last_name: string; email: string } | null);

  const clientEmail = clientRaw?.email ?? undefined;
  const clientName = clientRaw
    ? `${clientRaw.first_name} ${clientRaw.last_name}`
    : "Client";

  // ── Derive base URL ─────────────────────────────────────────────────────────
  // Use NEXT_PUBLIC_SITE_URL in production; fall back to request host in dev.
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!baseUrl) {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ??
      headersList.get("host") ??
      "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    baseUrl = `${protocol}://${host}`;
  }

  // ── Create Stripe Checkout session ──────────────────────────────────────────
  const stripe = getStripe();
  const ref = job.internal_ref ?? jobId.slice(0, 8).toUpperCase();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: clientEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Vehicle Appraisal — ${ref}`,
            description: `Lomond Appraisal Group — Professional vehicle appraisal report for ${clientName}.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      job_id: jobId,
      internal_ref: ref,
    },
    // Phase 8 will update these to the client portal; for now use public site
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
  });

  if (!session.url) {
    return { success: false, error: "Stripe did not return a checkout URL." };
  }

  // ── Upsert payment record with checkout session ID ──────────────────────────
  await service.from("payments").upsert(
    {
      job_id: jobId,
      status: "invoiced",
      amount_cents: amountCents,
      stripe_checkout_session_id: session.id,
      method: "stripe",
    },
    { onConflict: "job_id" }
  );

  return { success: true, url: session.url };
}
