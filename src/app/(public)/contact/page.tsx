import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { ContactForm } from "@/components/public/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Lomond Appraisal Group",
  description:
    "Get in touch with Lomond Appraisal Group. We review incoming messages within one to two business days.",
};

export default function ContactPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand-gold">
              Get in Touch
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Contact Us
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Have a question before you request an appraisal? Use the form
              below and we&rsquo;ll get back to you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
          {/* Form */}
          <div>
            <ContactForm />
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-secondary/40 p-6">
              <div className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
                <Clock className="h-4 w-4 text-brand-navy" />
                Response time
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We review incoming messages within one to two business days.
                We&rsquo;ll reply to the email address you provide.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-6">
              <div className="mb-3 flex items-center gap-2.5 text-sm font-semibold">
                <FileText className="h-4 w-4 text-brand-navy" />
                Ready to get started?
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                If you&rsquo;re ready to request an appraisal — or want to
                describe your situation so we can tell you if and how we can
                help — use the request form instead.
              </p>
              <Link
                href="/request"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-brand-navy text-white hover:bg-brand-navy-dark w-full"
                )}
              >
                Request an Appraisal
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              This contact form is for general inquiries only. Submitting a
              message does not create a client relationship or constitute a
              request for appraisal services.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
