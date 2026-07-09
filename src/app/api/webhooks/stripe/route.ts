/**
 * Stripe webhook handler — POST /api/webhooks/stripe
 *
 * Security:
 *  - Signature is verified with STRIPE_WEBHOOK_SECRET before any data is
 *    trusted or written. Unsigned requests return 400 immediately.
 *  - Uses the service client (no user session) — Stripe events are server→server.
 *  - Handler is idempotent: re-delivering a completed session does not
 *    overwrite an already-paid record incorrectly.
 *
 * Development:
 *  Use the Stripe CLI to forward events:
 *    stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(message = "ok") {
  return NextResponse.json({ received: true, message }, { status: 200 });
}

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Config guard ────────────────────────────────────────────────────────────
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    // Return 200 to prevent Stripe from retrying endlessly in dev
    return ok("Stripe/Supabase not configured — ignoring event.");
  }

  // ── Read raw body (required for signature verification) ──────────────────────
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return err("Missing stripe-signature header.");
  }

  // ── Verify signature ────────────────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return err(`Webhook signature verification failed: ${message}`);
  }

  // ── Dispatch event ──────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;

      case "payment_intent.payment_failed":
        // Log but don't update payment status — let the checkout session handle state
        console.warn(
          "[stripe-webhook] payment_intent.payment_failed:",
          (event.data.object as Stripe.PaymentIntent).id
        );
        break;

      default:
        // Acknowledge unhandled events without error
        break;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[stripe-webhook] Handler error:", event.type, message);
    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: "Internal handler error." },
      { status: 500 }
    );
  }

  return ok();
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const jobId = session.metadata?.job_id;
  if (!jobId) {
    console.warn(
      "[stripe-webhook] checkout.session.completed: no job_id in metadata",
      session.id
    );
    return;
  }

  const service = await createServiceClient();

  // Fetch existing payment to preserve data and avoid double-writing paid_at
  const { data: existing } = await service
    .from("payments")
    .select("id, status, paid_at")
    .eq("job_id", jobId)
    .single();

  // Already marked paid — idempotency guard
  if (existing?.status === "paid") {
    return;
  }

  const now = new Date().toISOString();
  const amountCents = session.amount_total ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Upsert payment record
  const { error: upsertError } = await service.from("payments").upsert(
    {
      job_id: jobId,
      status: "paid",
      amount_cents: amountCents,
      paid_at: now,
      method: "stripe",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    },
    { onConflict: "job_id" }
  );

  if (upsertError) {
    throw new Error(
      `Failed to update payment for job ${jobId}: ${upsertError.message}`
    );
  }

  // Audit log — no actor_id since this is a Stripe server event
  await service.from("audit_logs").insert({
    job_id: jobId,
    actor_id: null,
    event_type: "payment_updated",
    metadata: {
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: amountCents,
      source: "stripe_webhook",
    },
  });
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session
): Promise<void> {
  const jobId = session.metadata?.job_id;
  if (!jobId) return;

  const service = await createServiceClient();

  // Only revert to 'unpaid' if the current status is still 'invoiced'
  // (don't touch a record that's already been paid via a different session)
  await service
    .from("payments")
    .update({ status: "unpaid", stripe_checkout_session_id: null })
    .eq("job_id", jobId)
    .eq("status", "invoiced")
    .eq("stripe_checkout_session_id", session.id);
}
