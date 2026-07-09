/**
 * Stripe singleton — server-side only.
 * Never import this in Client Components.
 * STRIPE_SECRET_KEY must never be in NEXT_PUBLIC_* vars.
 */

import Stripe from "stripe";

// Module-level singleton — avoids re-instantiating on every hot-reload in dev.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to .env.local to enable Stripe."
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
  );
}
