import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ShieldCheck, FileText, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Lomond Appraisal Group",
  description:
    "Lomond Appraisal Group is an independent vehicle appraisal company providing professional valuation services for insurance claims, legal matters, and private transactions.",
};

const principles = [
  {
    icon: ShieldCheck,
    title: "Independence, not affiliation",
    body: "We don't work for insurance companies. We don't have relationships with repair shops, dealers, or any party that could create a conflict of interest. Our job is to produce an accurate appraisal — and to stand behind it.",
  },
  {
    icon: FileText,
    title: "Individual work, not automation",
    body: "Every appraisal reflects the specific vehicle, its specific condition, and the current market at the time of the appraisal. We don't produce automated or templated valuations. We research, we analyze, we document our reasoning.",
  },
  {
    icon: Users,
    title: "Clear reporting you can use",
    body: "Our reports explain how we arrived at our conclusion. We document the market data, the methodology, and the factors that influenced the value. A report you can't explain to an insurance adjuster or a judge isn't useful — ours are.",
  },
];

const whoWeServe = [
  "Individuals whose vehicles were damaged in accidents caused by another party",
  "Vehicle owners disputing an insurance company's total loss valuation",
  "Collectors and enthusiasts who need proper agreed value documentation for specialty insurance",
  "Buyers and sellers seeking independent market value confirmation",
  "Attorneys and legal professionals who need documented vehicle valuations for litigation",
  "Estate administrators, executors, and trustees handling vehicle assets",
  "Individuals donating vehicles who need IRS-compliant appraisal documentation",
];

export default function AboutPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand-gold">
              About Lomond Appraisal Group
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Independent. Documented. Defensible.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We provide professional vehicle appraisal services for individuals
              who need an accurate, independent valuation — and the documentation
              to back it up.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who we are ───────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">
                What we do
              </h2>
              <div className="space-y-4 text-foreground/90 leading-relaxed">
                <p>
                  Lomond Appraisal Group is an independent vehicle appraisal
                  company. We provide professional valuation services for
                  individuals dealing with insurance claims, vehicle purchases,
                  estate settlements, and other situations where an accurate,
                  well-documented vehicle value matters.
                </p>
                <p>
                  The vehicle appraisal field intersects with insurance law,
                  consumer rights, and financial documentation in ways that
                  directly affect how much money people recover after accidents,
                  how well their vehicles are insured, and how cleanly
                  transactions and legal matters are resolved. We take that
                  seriously.
                </p>
                <p>
                  We don&rsquo;t offer opinions off the top of our heads. Every
                  appraisal we produce is researched, documented, and signed —
                  and we explain our methodology so you understand exactly how
                  we arrived at our conclusion.
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">
                Why independence matters
              </h2>
              <div className="space-y-4 text-foreground/90 leading-relaxed">
                <p>
                  When an insurance company tells you what your vehicle is
                  worth, that number comes from a party with a financial
                  interest in keeping it low. When a dealer tells you what
                  your trade-in is worth, their interest runs in the same
                  direction.
                </p>
                <p>
                  An independent appraisal changes that dynamic. It gives you
                  a professionally supported, documented number that isn&rsquo;t
                  shaped by anyone else&rsquo;s financial interests.
                </p>
                <p>
                  That independence is only meaningful if it&rsquo;s real.
                  We don&rsquo;t accept referrals from insurance companies. We
                  don&rsquo;t have financial relationships with dealers or
                  repair facilities. Our only obligation is to produce an
                  accurate appraisal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="mx-auto max-w-6xl" />

      {/* ── Principles ───────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight">
            How we approach our work
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/8 text-brand-navy">
                  <Icon className="h-5 w-5" />
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

      <Separator className="mx-auto max-w-6xl" />

      {/* ── Who we serve ─────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-5 text-2xl font-semibold tracking-tight">
                Who we work with
              </h2>
              <ul className="space-y-3">
                {whoWeServe.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-center rounded-xl border border-border bg-secondary/40 p-8">
              <h3 className="mb-3 text-lg font-semibold">
                Not sure if we can help?
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Submit a request and describe your situation. We&rsquo;ll review
                it and let you know whether we can assist and what that would
                look like. There&rsquo;s no obligation to proceed.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/request"
                  className={cn(
                    buttonVariants(),
                    "bg-brand-navy text-white hover:bg-brand-navy-dark"
                  )}
                >
                  Submit a request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer note ──────────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Lomond Appraisal Group provides vehicle appraisal services. Submitting
            a request does not create a client relationship or guarantee acceptance
            of an assignment. Appraisal reports reflect professional opinion
            based on available information and market data at the time of the
            appraisal. Past outcomes in insurance disputes or legal proceedings
            are not indicative of future results.
          </p>
        </div>
      </section>
    </>
  );
}
