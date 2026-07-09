import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Lomond Appraisal Group",
  description:
    "How Lomond Appraisal Group collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "May 2025";

export default function PrivacyPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-medium text-brand-gold">Legal</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Privacy Policy
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
            Lomond Appraisal Group (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
            &ldquo;us&rdquo;) provides professional vehicle appraisal services.
            This Privacy Policy describes how we collect, use, and protect
            information you provide when you use our website or engage our
            services.
          </p>

          <h2>Information we collect</h2>
          <p>
            We collect information you provide directly, including:
          </p>
          <ul>
            <li>
              <strong>Contact information</strong> — name, email address, and
              phone number when you submit an inquiry or appraisal request.
            </li>
            <li>
              <strong>Vehicle information</strong> — year, make, model, VIN,
              mileage, and condition details relevant to your appraisal request.
            </li>
            <li>
              <strong>Claim and insurance information</strong> — accident date,
              claim number, insurance carrier details, and related documentation
              you upload or provide.
            </li>
            <li>
              <strong>Documents and photographs</strong> — repair estimates,
              inspection photos, insurance correspondence, and other files you
              submit as part of an appraisal assignment.
            </li>
            <li>
              <strong>Communications</strong> — messages, emails, and notes
              exchanged in connection with your inquiry or assignment.
            </li>
          </ul>
          <p>
            We also automatically collect certain technical information when you
            visit our website, including IP address, browser type, pages
            visited, and referring URLs. This information is collected through
            standard server logs and third-party analytics tools.
          </p>

          <h2>How we use your information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Evaluate and respond to appraisal requests and inquiries.</li>
            <li>
              Conduct appraisals and produce written appraisal reports on your
              behalf.
            </li>
            <li>
              Communicate with you about your assignment, including status
              updates, questions, and delivery of completed reports.
            </li>
            <li>
              Maintain records associated with completed assignments for
              professional and legal purposes.
            </li>
            <li>
              Improve our website and services based on usage patterns and
              feedback.
            </li>
            <li>Comply with applicable legal obligations.</li>
          </ul>
          <p>
            We do not sell your personal information to third parties. We do not
            use your information for advertising or marketing purposes beyond
            direct communications related to your inquiry.
          </p>

          <h2>How we store and protect your information</h2>
          <p>
            Our platform is built on Supabase, which stores data on
            infrastructure hosted in the United States. Files you upload — such
            as vehicle photographs, repair estimates, and insurance documents —
            are stored in private, access-controlled storage. File access
            requires authentication; files are not publicly accessible.
          </p>
          <p>
            We implement reasonable technical and organizational measures to
            protect your information against unauthorized access, disclosure, or
            loss. No method of transmission or storage is completely secure,
            and we cannot guarantee absolute security.
          </p>

          <h2>Third-party services</h2>
          <p>
            We use a limited number of third-party services to operate our
            platform. These currently include:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — database, file storage, and
              authentication infrastructure.
            </li>
            <li>
              <strong>Vercel</strong> — web hosting and deployment.
            </li>
          </ul>
          <p>
            We may add additional service providers over time (such as email
            delivery or payment processing) as our platform develops. We will
            update this policy to reflect material changes.
          </p>
          <p>
            These service providers may have access to your information only as
            necessary to perform their functions and are obligated to protect it
            appropriately.
          </p>

          <h2>Data retention</h2>
          <p>
            We retain information associated with your account and completed
            assignments for as long as necessary for professional, legal, and
            business purposes. Appraisal records are typically retained for a
            period of years consistent with professional standards and potential
            legal needs. You may contact us to inquire about specific retention
            practices for your information.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on your location, you may have rights regarding your
            personal information, including the right to access, correct, or
            request deletion of information we hold about you. To exercise these
            rights, contact us using the information on our{" "}
            <Link
              href="/contact"
              className="font-medium text-brand-navy underline-offset-4 hover:underline"
            >
              Contact page
            </Link>
            .
          </p>
          <p>
            We will respond to requests within a reasonable timeframe. Some
            information may be retained where we have a legal or professional
            obligation to do so.
          </p>

          <h2>Cookies and tracking</h2>
          <p>
            Our website may use cookies or similar technologies for session
            management and analytics. Session cookies are necessary for the
            secure operation of authenticated areas of the site. Analytics
            cookies, if used, collect aggregate traffic data.
          </p>
          <p>
            You can control cookie settings through your browser. Disabling
            certain cookies may affect the functionality of the site.
          </p>

          <h2>Children&rsquo;s privacy</h2>
          <p>
            Our services are not directed to individuals under the age of 18.
            We do not knowingly collect personal information from children. If
            you believe we have inadvertently collected such information, contact
            us and we will take steps to delete it.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material
            changes will be reflected in the &ldquo;Last updated&rdquo; date at
            the top of this page. Your continued use of our website or services
            following any changes constitutes acceptance of the updated policy.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy or our privacy practices can be
            submitted through our{" "}
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
