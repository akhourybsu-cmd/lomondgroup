import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const serviceLinks = [
  { href: "/services#diminished-value", label: "Diminished Value" },
  { href: "/services#total-loss", label: "Total Loss Dispute" },
  { href: "/services#classic-collector", label: "Classic & Collector" },
  { href: "/services#pre-purchase", label: "Pre-Purchase Appraisal" },
  { href: "/services#fair-market-value", label: "Fair Market Value" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/request", label: "Request an Appraisal" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Disclaimer" },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-brand-navy">
                Lomond Appraisal Group
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                Independent Auto Appraisals
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Professional vehicle appraisal services for diminished value
              claims, total loss disputes, classic vehicles, and more.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Services
            </h3>
            <ul className="space-y-2">
              {serviceLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Company
            </h3>
            <ul className="space-y-2">
              {companyLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact placeholder */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions? Use our contact form or request an appraisal to get
              started.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-sm font-medium text-brand-navy hover:text-brand-navy-dark transition-colors"
            >
              Get in touch →
            </Link>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Lomond Appraisal Group. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
