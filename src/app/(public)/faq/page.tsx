import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ — Lomond Appraisal Group",
  description:
    "Answers to common questions about vehicle appraisals, diminished value claims, total loss disputes, the appraisal process, and working with Lomond Appraisal Group.",
};

const faqGroups = [
  {
    label: "Diminished Value",
    items: [
      {
        q: "What is diminished value?",
        a: "Diminished value refers to the reduction in a vehicle's market value following an accident, even after professional repairs have been completed. When a car has an accident on its history, buyers typically pay less for it than they would for an identical vehicle with a clean record — regardless of how well the repairs were done. This difference in value is what a diminished value appraisal documents and quantifies.",
      },
      {
        q: "Can I file a diminished value claim against my own insurance company?",
        a: "In most cases, first-party diminished value claims — claims against your own insurer under your own policy — are not recoverable in most states. Diminished value claims are most commonly viable as third-party claims against the at-fault driver's liability insurer. The rules vary by state, policy language, and the facts of the accident. An appraisal report documents the value loss, but whether you can recover it depends on your specific situation. We recommend consulting with an attorney familiar with your state's laws if you have questions about your legal rights.",
      },
      {
        q: "How long do I have to file a diminished value claim?",
        a: "Statutes of limitations for vehicle-related claims vary by state, typically ranging from one to six years from the date of the accident. Acting promptly is advisable — the longer you wait, the more market conditions change and the harder it becomes to reconstruct what your vehicle was worth at the time of the loss. If you believe you have a claim, it's worth pursuing sooner rather than later.",
      },
    ],
  },
  {
    label: "Total Loss & Insurance Disputes",
    items: [
      {
        q: "What is an appraisal clause and how does it work?",
        a: "Many auto insurance policies include an appraisal clause — a formal dispute resolution process that either you or your insurer can invoke when you disagree on the value of a totaled vehicle. Under a typical appraisal clause, each party selects an independent appraiser. The two appraisers attempt to agree on the vehicle's value. If they cannot agree, they jointly select an umpire, whose decision is binding. An independent appraisal from Lomond Appraisal Group serves as your appraisal in this process. Check your policy's declarations page or contact your insurer to determine whether your policy includes an appraisal clause.",
      },
      {
        q: "My insurer's total loss offer seems low. What are my options?",
        a: "You have several options. First, you can negotiate directly with the insurer — provide documentation of comparable vehicles in your market and point out any features or condition factors their valuation missed. Second, if your policy has an appraisal clause, you can invoke it and request an independent appraisal. Third, depending on your state, you may have other legal remedies. An independent appraisal from us gives you a professionally documented, defensible number to work from — regardless of which approach you take.",
      },
    ],
  },
  {
    label: "The Appraisal Process",
    items: [
      {
        q: "How does the appraisal process work?",
        a: "It starts with your request. After you submit, we review your information and contact you to confirm the scope of the appraisal, the timeline, and the fee. Depending on the appraisal type, we may conduct an in-person inspection, a remote appraisal using photographs and documentation you provide, or a combination. We then research comparable market data, prepare our written report, and deliver it to you. We'll walk you through what to expect when we confirm your assignment.",
      },
      {
        q: "How long does an appraisal take?",
        a: "Turnaround time varies based on appraisal type, whether an in-person inspection is required, your location, and current workload. For most standard appraisals where we have all necessary documentation, expect three to seven business days from the time the assignment is confirmed. We'll provide a specific timeline estimate when we accept your request.",
      },
      {
        q: "What documents or information will I need to provide?",
        a: "Required documents vary by appraisal type, but commonly include: photos of the vehicle (exterior, interior, odometer, VIN plate), repair estimates or completed repair documentation, insurance company communications or valuation reports, and the vehicle's title or registration. For classic and collector vehicles, documentation of the vehicle's history, any restoration work, or special features is helpful. Our intake form will guide you through what's needed for your specific situation.",
      },
      {
        q: "Do you conduct in-person inspections?",
        a: "It depends on the appraisal type and your location. Some appraisals — particularly classic vehicle agreed value appraisals and certain pre-purchase appraisals — benefit significantly from an in-person inspection. Others, such as many diminished value and total loss dispute appraisals, can be conducted using photographs and documentation. We'll tell you what's needed when we review your request. Geographic availability for in-person work varies.",
      },
    ],
  },
  {
    label: "Using Your Appraisal",
    items: [
      {
        q: "Can I use your appraisal report with my insurance company?",
        a: "Yes. Our reports are written to serve as professional documentation suitable for insurance negotiations and, where applicable, formal appraisal clause processes. The usefulness of any appraisal report in a given situation depends on the specific facts of your claim, your policy language, and applicable state law. We cannot guarantee any particular outcome, but we produce reports that meet professional standards and clearly document our methodology.",
      },
      {
        q: "Can your appraisal be used in court or legal proceedings?",
        a: "Our appraisal reports can be used as supporting documentation in legal proceedings. Whether an appraisal report will be admitted as evidence, and the weight it will carry, depends on the specific proceeding, jurisdiction, and applicable rules. If you are involved in litigation, we recommend discussing your needs with your attorney so we can tailor the report appropriately.",
      },
    ],
  },
  {
    label: "Fees & Practicalities",
    items: [
      {
        q: "How much does an appraisal cost?",
        a: "Fees vary depending on the appraisal type, the vehicle, and the scope of work involved. We'll provide a clear fee quote when we review your request — there's no cost to submit a request and no obligation to proceed. We don't charge by a percentage of the appraisal value.",
      },
      {
        q: "Does submitting a request obligate me to anything?",
        a: "No. Submitting a request allows us to review your situation and provide information about whether and how we can help. We'll confirm the scope, timeline, and fee before any work begins. You're under no obligation to proceed after receiving that information.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand-gold">
              Frequently Asked Questions
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Common Questions
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Answers about vehicle appraisals, the claims process, and how we
              work. If you don&rsquo;t see what you&rsquo;re looking for,{" "}
              <Link
                href="/contact"
                className="font-medium text-brand-navy underline-offset-4 hover:underline"
              >
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ groups ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="space-y-12">
          {faqGroups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <Accordion multiple={false} className="space-y-1">
                {group.items.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${group.label}-${idx}`}
                    className="rounded-lg border border-border bg-white px-5"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-medium leading-snug hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-foreground/85">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Legal note */}
        <div className="mt-12 rounded-lg border border-border bg-secondary/40 p-5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">Note:</strong> The
            information on this page is general in nature and does not constitute
            legal advice. Vehicle appraisal law, insurance regulations, and
            consumer rights vary significantly by state. For guidance specific
            to your situation, consult a qualified attorney.
          </p>
        </div>
      </div>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-secondary/30 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Ready to move forward?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Submit a request and we&rsquo;ll review your situation. No
            obligation to proceed.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
              href="/contact"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
