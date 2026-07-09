"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreatePortalCheckoutSessionResult {
  success: boolean;
  error?: string;
  url?: string;
}

// UUID format guard — prevents malformed token from reaching Stripe/DB
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Public action — no user auth required.
 * Validates the portal token, then creates a Stripe Checkout session
 * so the client can pay directly from their portal.
 */
export async function createPortalCheckoutSession(
  portalToken: string
): Promise<CreatePortalCheckoutSessionResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: "Supabase not configured." };
  }
  if (!isStripeConfigured()) {
    return { success: false, error: "Stripe is not configured." };
  }
  if (!UUID_REGEX.test(portalToken)) {
    return { success: false, error: "Invalid portal token." };
  }

  const service = await createServiceClient();

  // ── Validate token → fetch job + client + payment ───────────────────────────
  const { data: job } = await service
    .from("appraisal_jobs")
    .select(
      `
      id, internal_ref, quoted_fee_cents,
      client:clients(first_name, last_name, email)
    `
    )
    .eq("portal_token", portalToken)
    .single();

  if (!job) {
    return { success: false, error: "Portal link not found." };
  }

  const { data: payment } = await service
    .from("payments")
    .select("status, amount_cents")
    .eq("job_id", job.id)
    .single();

  // Block if already paid
  if (payment?.status === "paid" || payment?.status === "waived") {
    return { success: false, error: "This invoice has already been paid." };
  }

  // Resolve amount
  const amountCents = payment?.amount_cents ?? job.quoted_fee_cents ?? null;
  if (!amountCents || amountCents <= 0) {
    return {
      success: false,
      error:
        "No payment amount has been set yet. Please contact us for payment details.",
    };
  }

  // Resolve client details
  const clientRaw = Array.isArray(job.client)
    ? (job.client[0] as {
        first_name: string;
        last_name: string;
        email: string;
      } | undefined)
    : (job.client as {
        first_name: string;
        last_name: string;
        email: string;
      } | null);

  const clientEmail = clientRaw?.email;
  const clientName = clientRaw
    ? `${clientRaw.first_name} ${clientRaw.last_name}`
    : "Client";

  // ── Derive base URL ─────────────────────────────────────────────────────────
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
  const ref = job.internal_ref ?? job.id.slice(0, 8).toUpperCase();

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
            description: `Lomond Appraisal Group — Professional vehicle appraisal for ${clientName}.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      job_id: job.id,
      portal_token: portalToken,
    },
    // Return client to their portal after payment
    success_url: `${baseUrl}/portal/${portalToken}?payment=success`,
    cancel_url: `${baseUrl}/portal/${portalToken}?payment=cancelled`,
  });

  if (!session.url) {
    return { success: false, error: "Stripe did not return a checkout URL." };
  }

  // Update payment record with latest session ID
  await service.from("payments").upsert(
    {
      job_id: job.id,
      status: "invoiced",
      amount_cents: amountCents,
      stripe_checkout_session_id: session.id,
      method: "stripe",
    },
    { onConflict: "job_id" }
  );

  return { success: true, url: session.url };
}
