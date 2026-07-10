"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  CalendarClock,
  Building2,
  FileText,
  CalendarDays,
  Route,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/app/actions/auth";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/jobs", label: "Job Board", icon: Briefcase, exact: false },
  { href: "/admin/clients", label: "Clients", icon: Users, exact: false },
  {
    href: "/admin/uploads",
    label: "Uploads",
    icon: FileText,
    exact: false,
  },
  {
    href: "/admin/appointments",
    label: "Appointments",
    icon: CalendarClock,
    exact: false,
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/admin/routes",
    label: "Routes",
    icon: Route,
    exact: false,
  },
  {
    href: "/admin/contractors",
    label: "Contractors",
    icon: Building2,
    exact: false,
  },
  {
    href: "/admin/taxes",
    label: "Taxes",
    icon: Calculator,
    exact: false,
  },
];

const bottomItems = [
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
}

function NavItem({ href, label, icon: Icon, exact }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive
              ? "text-sidebar-primary"
              : "opacity-70 group-hover:opacity-100"
          )}
        />
        <span>{label}</span>
        {isActive && (
          <ChevronRight className="ml-auto h-3 w-3 text-sidebar-primary opacity-70" />
        )}
      </Link>
    </li>
  );
}

export function AdminSidebar() {
  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar text-sidebar-foreground xl:w-64">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link href="/admin" className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-sidebar-foreground">
            Lomond Appraisal
          </span>
          <span className="text-xs text-sidebar-foreground/50">
            Admin Dashboard
          </span>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </ul>

        <Separator className="my-4 bg-sidebar-border" />

        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          System
        </p>
        <ul className="space-y-0.5">
          {bottomItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
