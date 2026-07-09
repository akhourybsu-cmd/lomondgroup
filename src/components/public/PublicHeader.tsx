"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PublicNav } from "./PublicNav";

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo / wordmark */}
        <Link
          href="/"
          className="flex flex-col leading-tight"
          aria-label="Lomond Appraisal Group — home"
        >
          <span className="text-base font-semibold tracking-tight text-brand-navy sm:text-lg">
            Lomond Appraisal Group
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Independent Auto Appraisals &amp; Vehicle Valuation
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 lg:flex">
          <PublicNav />
          <Link
            href="/request"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-brand-navy hover:bg-brand-navy-dark text-white"
            )}
          >
            Request an Appraisal
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/request"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-brand-navy hover:bg-brand-navy-dark text-white text-xs px-3"
            )}
          >
            Get Started
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 pt-8">
          <SheetTitle className="mb-6 text-sm font-medium text-muted-foreground">
            Navigation
          </SheetTitle>
          <PublicNav onLinkClick={() => setMobileOpen(false)} />
          <div className="mt-8 border-t border-border pt-6">
            <Link
              href="/request"
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants(),
                "w-full bg-brand-navy hover:bg-brand-navy-dark text-white"
              )}
            >
              Request an Appraisal
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
