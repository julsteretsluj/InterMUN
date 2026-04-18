"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  DoorOpen,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  Settings,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SmtNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Live committees hub: `/smt` and `/smt/committees/*` */
  isLiveHub?: boolean;
};

const SMT_NAV_ITEMS: SmtNavItem[] = [
  { href: "/smt", label: "Live committees", icon: Activity, isLiveHub: true },
  { href: "/smt/conference", label: "Event & sessions", icon: CalendarDays },
  { href: "/smt/room-codes", label: "Room codes & chairs", icon: DoorOpen },
  { href: "/smt/awards", label: "Awards", icon: Trophy },
  { href: "/smt/allocation-matrix", label: "Allocation matrix", icon: Users },
  { href: "/smt/allocation-passwords", label: "Allocation passwords", icon: KeyRound },
  { href: "/smt/profile", label: "Profile", icon: Settings },
  { href: "/smt/follow", label: "Follow", icon: UserPlus },
];

function smtNavItemIsActive(pathname: string, item: SmtNavItem): boolean {
  if (item.isLiveHub) {
    return pathname === "/smt" || pathname.startsWith("/smt/committees/");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SmtSidebarLink({ item, isActive }: { item: SmtNavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "discord-interactive-hover flex items-center gap-0 rounded-md px-2 py-2.5 text-sm transition-colors group-hover:gap-3 group-hover:px-3",
        isActive
          ? "smt-nav-row-active bg-gradient-to-r from-logo-magenta/20 via-brand-accent/15 to-logo-cyan/20 font-semibold text-brand-navy ring-1 ring-logo-orange/25 dark:text-white dark:ring-0"
          : "font-medium text-slate-600 hover:bg-slate-100 dark:text-discord-muted dark:hover:bg-[color:var(--discord-hover-bg)]"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-brand-accent dark:text-discord-blurple" : "text-slate-400 dark:text-zinc-500"
        )}
        strokeWidth={1.75}
      />
      <span className="hidden truncate group-hover:inline">{item.label}</span>
    </Link>
  );
}

function SmtDockLink({ item, isActive }: { item: SmtNavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className="group flex shrink-0 snap-start flex-col items-center gap-1 px-1.5 py-2"
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-all duration-200",
          isActive
            ? "smt-dock-tile-active scale-[1.02] border-logo-orange/40 bg-gradient-to-br from-logo-magenta/22 via-brand-accent/14 to-logo-cyan/20 text-brand-navy shadow-lg shadow-logo-magenta/15 dark:border-discord-blurple/55 dark:text-white dark:shadow-none"
            : "border-slate-200/90 bg-white text-slate-500 group-hover:border-brand-accent/30 group-hover:bg-slate-50 group-hover:text-brand-diplomatic dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-white/10 dark:group-hover:bg-[color:var(--discord-hover-bg)]"
        )}
      >
        <Icon className="h-[1.35rem] w-[1.35rem] opacity-95" strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "max-w-[4.25rem] text-center text-[0.625rem] font-medium leading-tight",
          isActive ? "text-brand-accent dark:text-white" : "text-slate-600 dark:text-discord-muted"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function SmtDashboardSidebar({ hubLabel }: { hubLabel: string }) {
  const pathname = usePathname();
  const hubActive = pathname === "/smt" || pathname.startsWith("/smt/committees/");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-1.5 pb-2 pt-3 group-hover:px-3">
        <Link
          href="/smt"
          title={hubLabel}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-logo-magenta via-logo-orange to-logo-cyan px-3 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-logo-magenta/25 transition hover:opacity-95 dark:from-logo-magenta dark:via-logo-orange dark:to-logo-cyan dark:shadow-logo-cyan/20",
            hubActive &&
              "ring-2 ring-white/50 ring-offset-2 ring-offset-white dark:ring-logo-cyan/60 dark:ring-offset-[#1e1f22]"
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0 opacity-95" strokeWidth={1.75} aria-hidden />
          <span className="hidden min-w-0 truncate group-hover:inline">{hubLabel}</span>
          <span className="inline text-base leading-none group-hover:hidden" aria-hidden>
            SMT
          </span>
        </Link>
      </div>

      <nav
        aria-label="SMT dashboard"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 py-1 [scrollbar-width:thin] group-hover:px-3"
      >
        {SMT_NAV_ITEMS.map((item) => (
          <SmtSidebarLink key={item.href} item={item} isActive={smtNavItemIsActive(pathname, item)} />
        ))}
      </nav>

      <div className="mt-auto shrink-0 space-y-0.5 border-t border-slate-100 px-1.5 py-4 group-hover:px-3 dark:border-discord-divider">
        <Link
          href="/guides"
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-600 transition group-hover:px-3 hover:bg-slate-100 dark:text-discord-muted dark:hover:bg-[color:var(--discord-hover-bg)]"
        >
          <HelpCircle className="h-5 w-5 shrink-0 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
          <span className="hidden group-hover:inline">Help center</span>
        </Link>
      </div>
    </div>
  );
}

export function SmtMobileDock() {
  const pathname = usePathname();

  return (
    <div className="border-t border-slate-200/80 bg-brand-cream/95 backdrop-blur-md dark:border-discord-divider dark:bg-discord-sidebar/98 dark:backdrop-blur-md">
      <div className="flex items-center gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {SMT_NAV_ITEMS.map((item) => (
          <SmtDockLink key={item.href} item={item} isActive={smtNavItemIsActive(pathname, item)} />
        ))}
      </div>
    </div>
  );
}
