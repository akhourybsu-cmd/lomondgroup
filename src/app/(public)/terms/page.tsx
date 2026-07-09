import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Disclaimer — Lomond Appraisal Group",
  description:
    "Terms of use and professional disclaimer for Lomond Appraisal Group vehicle appraisal services.",
};

const LAST_UPDATED = "May 2025";

export default function TermsPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand-gold">Legal</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Terms &amp; Disclaimer
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="prose prose-sm prose-neutral max-w-none [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:first:mt-0 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-foreground/85 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-foreground/85 [&_li]:marker:text-brand-gold">

          <p>
            These Terms &amp; Disclaimer govern your use of the Lomond Appraisal
            Group website and your engagement of our appraisal services. By
            using this website or submitting a request for services, you agree
            to the terms set out below. Please read them carefully.
          </p>

          <h2>Nature of our services</h2>
          <p>
            Lomond Appraisal Group provides independent vehicle appraisal
            services. Our services consist of professional opinion of value —
            specifically, written appraisal reports documenting the estimated
            market value or diminished value of a vehicle based on available
            information, condition assessment, and market research at the time
            of the appraisal.
          </p>
          <p>
            An appraisal is a professional opinion, not a guarantee of value,
            sale price, or insurance recovery. The actual amount received in an
            insurance settlement, legal judgment, or private sale transaction
            may differ from the value stated in an appraisal report.
          </p>

          <h2>No legal advice</h2>
          <p>
            Nothing on this website, and nothing in any report, communication,
            or interaction with Lomond Appraisal Group, constitutes legal
            advice. We are appraisers, not attorneys.
          </p>
          <p>
            Information provided on this website about insurance claims,
            diminished value, appraisal clauses, and related topics is general
            in nature and is intended to help you understand the context for
            appraisal services — not to advise you on your specific legal rights
            or obligations. Laws, regulations, and policy terms vary
            significantly by state and individual circumstance.
          </p>
          <p>
            If you have questions about your legal rights in connection with an
            insurance claim, accident, or legal proceeding, consult a qualified
            attorney licensed in your state.
          </p>

          <h2>No guarantee of outcome</h2>
          <p>
            We cannot guarantee any particular outcome from the use of an
            appraisal report, including but not limited to:
          </p>
          <ul>
            <li>
              Acceptance of an appraisal report by an insurance company,
              adjuster, or opposing party.
            </li>
            <li>
              Admission of an appraisal report as evidence in any legal
              proceeding.
            </li>
            <li>
              Recovery of any particular amount in a settlement, judgment, or
              transaction.
            </li>
            <li>
              Resolution of any dispute in your favor.
            </li>
          </ul>
          <p>
            Whether an appraisal report is useful in a given context depends on
            the specific facts of your situation, the applicable law, policy
            language, and other factors outside our control.
          </p>

          <h2>No client relationship until confirmed</h2>
          <p>
            Submitting a request through our website does not create a
            professional relationship or obligate us to accept your assignment.
            A professional relationship is established only when we have
            confirmed acceptance of your assignment in writing and, where
            applicable, confirmed the fee arrangement.
          </p>
          <p>
            We reserve the right to decline any assignment for any reason,
            including where we determine we have a conflict of interest, lack
            the necessary expertise, or cannot complete the assignment within an
            acceptable timeframe.
          </p>

          <h2>Accuracy of information</h2>
          <p>
            The accuracy and usefulness of any appraisal we produce depends on
            the completeness and accuracy of the information you provide. You
            represent that information you submit to us — including vehicle
            descriptions, condition representations, repair documentation, and
            other materials — is accurate and complete to the best of your
            knowledge.
          </p>
          <p>
            Appraisals are based on information available at the time of the
            appraisal. Market conditions change, and values stated in an
            appraisal report reflect conditions at a specific point in time.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by applicable law, Lomond Appraisal
            Group&rsquo;s liability to you in connection with any appraisal
            assignment is limited to the fee paid for that specific assignment.
            We are not liable for any indirect, consequential, incidental, or
            special damages arising from your use of our services or reliance on
            our appraisal reports.
          </p>
          <p>
            This limitation does not exclude liability that cannot be excluded
            under applicable law.
          </p>

          <h2>Intellectual property</h2>
          <p>
            Appraisal reports prepared by Lomond Appraisal Group are delivered
            to you for your personal use in connection with the purpose for
            which the appraisal was commissioned. You may share the report with
            insurance companies, attorneys, and other parties directly involved
            in your claim or transaction.
          </p>
          <p>
            Reports may not be altered, republished, or presented as the work
            of any other person or entity. The content of this website,
            including text and design, is owned by Lomond Appraisal Group and
            may not be reproduced without permission.
          </p>

          <h2>Website use</h2>
          <p>
            This website is provided for informational purposes. You agree not
            to use it in any way that is unlawful, harmful, or that interferes
            with its operation. We make reasonable efforts to keep information
            on the site current but make no warranty about its accuracy or
            completeness.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue the website
            or any part of it at any time without notice.
          </p>

          <h2>Governing law</h2>
          <p>
            These terms are governed by applicable law. Any disputes arising
            from your use of this website or our services will be resolved in
            accordance with applicable legal requirements. Nothing in these
            terms limits any rights you may have under consumer protection laws
            that cannot be waived by contract.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these Terms &amp; Disclaimer from time to time.
            Material changes will be reflected in the &ldquo;Last updated&rdquo;
            date at the top of this page. Continued use of this website
            following any changes constitutes acceptance of the updated terms.
          </p>

          <h2>Questions</h2>
          <p>
            Questions about these terms can be submitted through our{" "}
            <Link
              href="/contact"
              className="font-medium text-brand-navy underline-offset-4 hover:underline"
            >
              Contact page
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
