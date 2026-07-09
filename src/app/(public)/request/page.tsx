import type { Metadata } from "next";
import { IntakeForm } from "@/components/intake/IntakeForm";

export const metadata: Metadata = {
  title: "Request an Appraisal — Lomond Appraisal Group",
  description:
    "Submit your vehicle appraisal request. Provide your contact information, vehicle details, and any relevant claim or insurance information.",
};

export default function RequestPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="mb-2 text-sm font-medium text-brand-gold">
            Get Started
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Request an Appraisal
          </h1>
          <p className="mt-3 text-muted-foreground">
            Complete the form below and we&rsquo;ll review your request and
            reach out to discuss scope, timeline, and fee. No obligation to
            proceed.
          </p>
        </div>
      </section>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <IntakeForm />
      </div>
    </>
  );
}
