"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Menu, Bell, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/app/actions/auth";
import { AdminSidebar } from "./AdminSidebar";

interface AdminHeaderProps {
  breadcrumbs?: { label: string; href?: string }[];
  userDisplayName?: string;
}

export function AdminHeader({
  breadcrumbs,
  userDisplayName = "Admin",
}: AdminHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  const initials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
      {/* Left: mobile menu + breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              <li>
                <Link
                  href="/admin"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Admin
                </Link>
              </li>
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-border">/</span>
                  {crumb.href && i < breadcrumbs.length - 1 ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      {/* Right: notifications + user menu */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-brand-navy text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{userDisplayName}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>
              <Link href="/admin/settings" className="w-full">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/" target="_blank" className="w-full">View public site</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              onClick={() => startSignOut(() => signOut())}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Signing out…
                </>
              ) : (
                "Sign out"
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AdminSidebar />
        </SheetContent>
      </Sheet>
    </header>
  );
}
