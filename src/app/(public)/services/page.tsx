import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingDown,
  ShieldCheck,
  Car,
  FileSearch,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services — Lomond Appraisal Group",
  description:
    "Independent vehicle appraisal services including diminished value claims, total loss disputes, classic and collector vehicle appraisals, pre-purchase inspections, and fair market value reports.",
};

const services = [
  {
    id: "diminished-value",
    icon: TrendingDown,
    title: "Diminished Value Appraisals",
    tagline: "Documenting the value your vehicle lost — even after repairs.",
    description: [
      "After a vehicle is involved in an accident and repaired, it typically sells for less than a comparable vehicle with no accident history. This reduction in resale value is called diminished value. Under most state laws, if the accident was caused by another driver, you may be entitled to compensation for this loss from the at-fault party's insurance.",
      "We provide independent, documented diminished value appraisals that calculate the difference between what your vehicle was worth before the accident and what it is worth now — even after repairs have been completed. Our reports are prepared specifically to support insurance negotiations and, when necessary, legal proceedings.",
    ],
    whenYouNeedIt: [
      "Your vehicle was in an accident caused by another driver",
      "The at-fault driver's insurer has settled the repair claim",
      "You believe your vehicle has lost resale value due to its accident history",
      "You want documented support for a diminished value demand",
    ],
    whatWeProvide: [
      "Written appraisal documenting pre-loss and post-repair values",
      "Market research supporting the valuation methodology",
      "Clear explanation of how diminished value was calculated",
      "Professional appraiser signature",
      "Report suitable for insurance negotiation or legal use",
    ],
  },
  {
    id: "total-loss",
    icon: ShieldCheck,
    title: "Total Loss Dispute & Insurance Settlement Reviews",
    tagline:
      "An independent second opinion when your insurer's number doesn't add up.",
    description: [
      "When an insurance company declares your vehicle a total loss, they calculate an Actual Cash Value (ACV) and base their settlement offer on that figure. Insurance company valuations are not always accurate — they may rely on flawed comparable vehicles, apply improper condition adjustments, or fail to account for recent improvements or documented vehicle features.",
      "An independent appraisal from Lomond Appraisal Group gives you a professionally supported, documented counterpoint to the insurer's valuation — one not produced by the party that benefits from a lower payout. If your policy contains an appraisal clause, our report can serve as your appraisal in that formal dispute process.",
    ],
    whenYouNeedIt: [
      "Your insurer has declared your vehicle a total loss",
      "You believe their ACV offer is lower than your vehicle's actual market value",
      "Your policy includes an appraisal clause and you want to invoke it",
      "You're preparing for a formal dispute or legal proceeding",
    ],
    whatWeProvide: [
      "Independent ACV appraisal based on current market data",
      "Documentation of comparable vehicles used in the analysis",
      "Clear explanation of valuation methodology",
      "Report formatted for insurance dispute processes",
      "Appraiser available to discuss findings as needed",
    ],
  },
  {
    id: "classic-collector",
    icon: Car,
    title: "Classic & Collector Vehicle Appraisals",
    tagline: "Agreed value appraisals for vehicles that deserve proper coverage.",
    description: [
      "Standard insurance policies cover vehicles at Actual Cash Value — which for classic, antique, modified, and specialty vehicles can dramatically understate what the vehicle is actually worth. An agreed value policy, supported by a current professional appraisal, ensures your vehicle is insured for its true value and that there's no depreciation applied at claim time.",
      "We provide agreed value appraisals for classic, vintage, antique, exotic, custom, and specialty vehicles. Our reports are designed to meet the documentation standards of specialty and collector vehicle insurance carriers.",
    ],
    whenYouNeedIt: [
      "Obtaining or renewing a specialty or collector vehicle insurance policy",
      "Your classic vehicle's value has appreciated and coverage needs updating",
      "Buying or selling a collectible vehicle and needing independent value documentation",
      "Estate settlement, probate, or charitable donation purposes",
      "Loan collateral or financial documentation",
    ],
    whatWeProvide: [
      "Agreed value appraisal with full vehicle description",
      "Condition assessment and supporting photographs",
      "Market analysis and comparable sales research",
      "Report accepted by most specialty vehicle insurance carriers",
      "Documentation suitable for insurance, financial, or legal purposes",
    ],
  },
  {
    id: "pre-purchase",
    icon: FileSearch,
    title: "Pre-Purchase Vehicle Appraisals",
    tagline:
      "Independent market value verification before you commit to buying.",
    description: [
      "A pre-purchase appraisal provides an independent assessment of a vehicle's market value before you buy it. Whether you're purchasing from a dealer or a private party, knowing the vehicle's fair market value protects you from overpaying and gives you an objective basis for negotiating.",
      "This is a market value appraisal, not a mechanical inspection. We assess whether the asking price aligns with current market conditions for that vehicle, its condition, and its history — and we document our conclusion in a written report.",
    ],
    whenYouNeedIt: [
      "Buying a used vehicle from a private party",
      "Purchasing a specialty, classic, or high-value vehicle",
      "Buying a vehicle remotely or from out of state",
      "You want independent documentation of fair market value at time of purchase",
    ],
    whatWeProvide: [
      "Written market value appraisal at the time of purchase",
      "Vehicle description and condition notes",
      "Market analysis supporting the valuation",
      "Documentation useful for purchase records or financing",
    ],
  },
  {
    id: "fair-market-value",
    icon: ClipboardList,
    title: "Fair Market Value & General Vehicle Valuations",
    tagline:
      "Documented valuations for legal, financial, and private transactions.",
    description: [
      "Fair market value is the price a vehicle would sell for between a willing buyer and a willing seller, both with reasonable knowledge of the relevant facts and neither under any compulsion to buy or sell. This standard is required for many legal, tax, and financial purposes.",
      "We provide documented fair market value appraisals for a range of situations where a professionally supported, independent valuation is required. Each report documents our methodology and the market data used to support our conclusion.",
    ],
    whenYouNeedIt: [
      "Estate settlement, probate, or trust administration",
      "Charitable vehicle donation (IRS documentation requirements)",
      "Divorce or marital asset valuation",
      "Legal proceedings requiring vehicle value documentation",
      "Private party sale or purchase documentation",
      "Business asset valuation",
    ],
    whatWeProvide: [
      "Written fair market value appraisal",
      "Valuation methodology and supporting market data",
      "Professional appraiser signature",
      "Report formatted for the applicable use case when relevant",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand-gold">
              Professional Vehicle Appraisal Services
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              What We Do
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We provide independent, documented vehicle appraisals for
              insurance claims, legal matters, and private transactions. Every
              appraisal is prepared individually — not automated, not
              templated.
            </p>
          </div>

          {/* Jump links */}
          <nav className="mt-8" aria-label="Jump to service">
            <ul className="flex flex-wrap gap-2">
              {services.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex items-center rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary hover:text-brand-navy"
                  >
                    {s.title.split(" ")[0] === "Total"
                      ? "Total Loss"
                      : s.title.split(/[\s&]/)[0]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* ── Service sections ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {services.map((service, idx) => {
          const Icon = service.icon;
          return (
            <section
              key={service.id}
              id={service.id}
              className="scroll-mt-20 py-14 sm:py-16"
            >
              {/* Section header */}
              <div className="mb-8 flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-navy/8 text-brand-navy">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {service.title}
                  </h2>
                  <p className="mt-1 text-base text-muted-foreground italic">
                    {service.tagline}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8 max-w-3xl space-y-4">
                {service.description.map((para, i) => (
                  <p key={i} className="leading-relaxed text-foreground/90">
                    {para}
                  </p>
                ))}
              </div>

              {/* Two-column bullets */}
              <div className="grid gap-6 sm:grid-cols-2 lg:gap-10">
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    When you may need this
                  </h3>
                  <ul className="space-y-2">
                    {service.whenYouNeedIt.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What we provide
                  </h3>
                  <ul className="space-y-2">
                    {service.whatWeProvide.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy/50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href={`/request`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-brand-navy text-white hover:bg-brand-navy-dark"
                  )}
                >
                  Request this appraisal
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>

              {idx < services.length - 1 && (
                <Separator className="mt-14 sm:mt-16" />
              )}
            </section>
          );
        })}
      </div>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Not sure which service applies to your situation?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Select &ldquo;Not sure&rdquo; when you submit your request and
            describe your situation. We&rsquo;ll review it and let you know
            what type of appraisal would best serve your needs.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/request"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-navy text-white hover:bg-brand-navy-dark font-semibold"
              )}
            >
              Submit a Request
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
