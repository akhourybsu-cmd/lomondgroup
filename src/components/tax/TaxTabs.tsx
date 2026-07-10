"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/taxes", label: "Overview", exact: true },
  { href: "/admin/taxes/income", label: "Income", exact: false },
  { href: "/admin/taxes/expenses", label: "Expenses", exact: false },
  { href: "/admin/taxes/mileage", label: "Mileage", exact: false },
  { href: "/admin/taxes/settings", label: "Settings", exact: false },
];

export function TaxTabs({ year }: { year: number }) {
  const pathname = usePathname();
  const qs = `?year=${year}`;

  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${qs}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
