import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSearch,
  ShieldCheck,
  Car,
  ClipboardList,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Lomond Appraisal Group — Independent Auto Appraisals & Vehicle Valuation",
  description:
    "Professional independent vehicle appraisal services including diminished value, total loss disputes, classic car appraisals, and pre-purchase inspections.",
};

const services = [
  {
    icon: TrendingDown,
    title: "Diminished Value",
    description:
      "Your vehicle loses value after an accident — even after repairs. We document that loss so you can pursue the compensation you deserve.",
    href: "/services#diminished-value",
  },
  {
    icon: ShieldCheck,
    title: "Total Loss Dispute",
    description:
      "Challenging an insurance company's valuation of your totaled vehicle? We provide an independent appraisal to support your claim.",
    href: "/services#total-loss",
  },
  {
    icon: Car,
    title: "Classic & Collector Vehicles",
    description:
      "Agreed value appraisals for classic, antique, exotic, and specialty vehicles — accepted by most specialty insurance carriers.",
    href: "/services#classic-collector",
  },
  {
    icon: FileSearch,
    title: "Pre-Purchase Appraisal",
    description:
      "Buying a used vehicle? Get an independent assessment of condition and fair market value before you commit.",
    href: "/services#pre-purchase",
  },
  {
    icon: ClipboardList,
    title: "Fair Market Value",
    description:
      "Accurate, defensible vehicle valuations for estate settlements, donations, legal proceedings, and private party sales.",
    href: "/services#fair-market-value",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-brand-navy to-brand-navy-dark py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-5 border-brand-gold/50 bg-brand-gold/10 text-brand-gold text-xs font-medium"
            >
              Independent Auto Appraisals
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Professional Vehicle
              <br />
              Appraisal Services
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Lomond Appraisal Group provides accurate, independent vehicle
              valuations for insurance claims, legal matters, and private
              transactions. We advocate for you with documented, defensible
              appraisals.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/request"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-brand-gold text-brand-navy-dark font-semibold hover:bg-brand-gold-light"
                )}
              >
                Request an Appraisal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                )}
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 80% 50%, white 0%, transparent 70%)",
          }}
        />
      </section>

      {/* ── Trust bar ───────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-secondary/50 py-5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground sm:gap-x-12">
            <span className="font-medium">Independent &amp; Unbiased</span>
            <span className="hidden text-border sm:inline">|</span>
            <span className="font-medium">Defensible, Documented Reports</span>
            <span className="hidden text-border sm:inline">|</span>
            <span className="font-medium">Insurance-Ready Appraisals</span>
            <span className="hidden text-border lg:inline">|</span>
            <span className="hidden font-medium lg:inline">
              Private &amp; Confidential
            </span>
          </div>
        </div>
      </section>

      {/* ── Services overview ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Appraisal Services
            </h2>
            <p className="mt-3 text-muted-foreground">
              From insurance disputes to private sales, we provide accurate
              independent vehicle valuations tailored to your situation.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, description, href }) => (
              <Card
                key={title}
                className="group relative border border-border bg-white transition-shadow hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                  <Link
                    href={href}
                    className="mt-4 inline-flex items-center text-xs font-medium text-brand-navy transition-colors hover:text-brand-navy-dark"
                  >
                    Learn more
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            ))}

            {/* CTA card */}
            <Card className="border-brand-navy/20 bg-brand-navy text-white">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div>
                  <h3 className="mb-2 font-semibold">
                    Not sure which service?
                  </h3>
                  <p className="text-sm leading-relaxed text-white/75">
                    Select &ldquo;Not sure&rdquo; in our intake form and
                    describe your situation. We&rsquo;ll help you determine the
                    right type of appraisal.
                  </p>
                </div>
                <Link
                  href="/request"
                  className={cn(
                    buttonVariants(),
                    "mt-6 bg-brand-gold text-brand-navy-dark hover:bg-brand-gold-light font-semibold"
                  )}
                >
                  Start Your Request
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-3 text-muted-foreground">
              A straightforward process designed around your schedule and
              situation.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Submit a Request",
                body: "Complete our online intake form with your contact, vehicle, and claim information.",
              },
              {
                step: "02",
                title: "We Review",
                body: "We review your request and contact you to confirm scope, timeline, and fee.",
              },
              {
                step: "03",
                title: "Appraisal & Research",
                body: "We inspect the vehicle, research comparable values, and document our findings.",
              },
              {
                step: "04",
                title: "Receive Your Report",
                body: "You receive a professional, signed appraisal report suitable for insurance or legal use.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="relative">
                <div className="mb-3 text-3xl font-bold leading-none text-brand-navy/15">
                  {step}
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Submit your appraisal request online. We&rsquo;ll review your
            information and be in touch to discuss next steps.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/request"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-navy text-white hover:bg-brand-navy-dark font-semibold"
              )}
            >
              Request an Appraisal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/faq"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
