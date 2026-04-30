"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SmtNavKey =
  | "liveCommittees"
  | "eventSessions"
  | "roomCodes"
  | "awards"
  | "allocationMatrix"
  | "allocationPasswords"
  | "profile";

type SmtNavItem = {
  href: string;
  navKey: SmtNavKey;
  emoji: string;
  /** Live committees hub: `/smt` and `/smt/committees/*` */
  isLiveHub?: boolean;
};

const SMT_NAV_ITEMS: SmtNavItem[] = [
  { href: "/smt", navKey: "liveCommittees", emoji: "📡", isLiveHub: true },
  { href: "/smt/conference", navKey: "eventSessions", emoji: "📅" },
  { href: "/smt/room-codes", navKey: "roomCodes", emoji: "🚪" },
  { href: "/smt/awards", navKey: "awards", emoji: "🏆" },
  { href: "/smt/allocation-matrix", navKey: "allocationMatrix", emoji: "👥" },
  { href: "/smt/allocation-passwords", navKey: "allocationPasswords", emoji: "🔐" },
  { href: "/smt/profile", navKey: "profile", emoji: "⚙️" },
];

function smtNavItemIsActive(pathname: string, item: SmtNavItem): boolean {
  if (item.isLiveHub) {
    return pathname === "/smt" || pathname.startsWith("/smt/committees/");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SmtSidebarLink({
  item,
  label,
  isActive,
}: {
  item: SmtNavItem;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "discord-interactive-hover flex w-full min-w-0 items-center justify-center gap-0 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-apple group-hover:justify-start group-hover:gap-3 group-hover:px-2.5",
        isActive
          ? "smt-nav-row-active font-semibold"
          : "font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]"
      )}
    >
      <span className="text-base leading-none" aria-hidden>{item.emoji}</span>
      <span className="hidden truncate group-hover:inline">{label}</span>
    </Link>
  );
}

function SmtDockLink({ item, label, isActive }: { item: SmtNavItem; label: string; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      title={label}
      className="group flex shrink-0 snap-start flex-col items-center gap-0.5 px-1.5 py-1.5 transition-apple active:scale-[0.97]"
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center text-brand-muted",
          isActive && "smt-dock-tile-active text-[var(--accent)]"
        )}
      >
        <span className="text-base leading-none" aria-hidden>{item.emoji}</span>
      </span>
      <span
        className={cn(
          "max-w-[4.25rem] text-center text-[0.625rem] font-medium leading-tight",
          isActive ? "font-semibold text-[var(--accent)]" : "text-brand-muted"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function SmtDashboardSidebar({ hubLabel }: { hubLabel: string }) {
  const tNav = useTranslations("smtNav");
  const tDash = useTranslations("dashboardLayout");
  const pathname = usePathname();
  const hubActive = pathname === "/smt" || pathname.startsWith("/smt/committees/");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-1.5 pb-2 pt-3 group-hover:px-3">
        <Link
          href="/smt"
          title={hubLabel}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--accent)] px-3 py-2.5 text-center text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-apple hover:opacity-95",
            hubActive &&
              "ring-2 ring-[color:color-mix(in_srgb,white_45%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)]"
          )}
        >
          <span className="text-base leading-none" aria-hidden>📌</span>
          <span className="hidden min-w-0 truncate group-hover:inline">{hubLabel}</span>
          <span className="inline text-base leading-none group-hover:hidden" aria-hidden>
            {tNav("hubAbbrev")}
          </span>
        </Link>
      </div>

      <nav
        aria-label={tNav("ariaDashboard")}
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 py-1 [scrollbar-width:thin] group-hover:px-3"
      >
        {SMT_NAV_ITEMS.map((item) => (
          <SmtSidebarLink
            key={item.href}
            item={item}
            label={tNav(item.navKey)}
            isActive={smtNavItemIsActive(pathname, item)}
          />
        ))}
      </nav>

      <div className="mt-auto shrink-0 space-y-0.5 border-t border-[var(--hairline)] px-1.5 py-4 group-hover:px-3">
        <Link
          href="/guides"
          className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
        >
          <span className="text-base leading-none" aria-hidden>❓</span>
          <span className="hidden group-hover:inline">{tDash("helpCenter")}</span>
        </Link>
      </div>
    </div>
  );
}

export function SmtMobileDock() {
  const tNav = useTranslations("smtNav");
  const pathname = usePathname();

  return (
    <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto max-w-2xl overflow-x-auto overscroll-x-contain rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-chrome)] px-2 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {SMT_NAV_ITEMS.map((item) => (
            <SmtDockLink
              key={item.href}
              item={item}
              label={tNav(item.navKey)}
              isActive={smtNavItemIsActive(pathname, item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
