"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function PublicNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-6">
        {navLinks.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              onClick={onLinkClick}
              className={cn(
                "block py-2 text-sm font-medium transition-colors lg:py-0",
                pathname === href
                  ? "text-brand-navy"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
