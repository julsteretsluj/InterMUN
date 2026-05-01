"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const LABELS_STORAGE_KEY = "intermun-chair-nav-hide-labels";

export type ChairNavItemKey =
  | "prepChecklist"
  | "flowChecklist"
  | "delegates"
  | "digitalRoom"
  | "rollCall"
  | "session"
  | "speakers"
  | "formalMotions"
  | "discipline"
  | "timer"
  | "announcements"
  | "voting"
  | "score"
  | "crisis"
  | "crisisSlides"
  | "archive"
  | "officialLinks"
  | "roomCode"
  | "settings";

type ChairNavItem = {
  href: string;
  itemKey: ChairNavItemKey;
  emoji: string;
  labelOverride?: string;
  /** If set, active when pathname === or starts with this */
  activeMatch?: string;
  /** When true, active only on exact `href` (no `/child` match). */
  exactHref?: boolean;
  /** Shown only for FWC / UNSC / HSC committees. */
  crisisOnly?: boolean;
};

/** Order aligned with [SEAMUNs Chair Room](https://thedashboard.seamuns.site/chair); InterMUN-only items follow Official links. */
const CHAIR_NAV_ITEMS: ChairNavItem[] = [
  { href: "/chair/prep-checklist", itemKey: "prepChecklist", emoji: "✅" },
  { href: "/chair/flow-checklist", itemKey: "flowChecklist", emoji: "📋" },
  { href: "/chair/allocation-matrix", itemKey: "delegates", emoji: "👥" },
  { href: "/chair/digital-room", itemKey: "digitalRoom", emoji: "🖥️" },
  {
    href: "/chair/session/roll-call",
    itemKey: "rollCall",
    emoji: "🧾",
  },
  {
    href: "/chair/session",
    itemKey: "session",
    emoji: "▶️",
    exactHref: true,
  },
  {
    href: "/chair/session/speakers",
    itemKey: "speakers",
    emoji: "🎤",
  },
  {
    href: "/chair/session/motions",
    itemKey: "formalMotions",
    emoji: "📜",
  },
  {
    href: "/chair/session/discipline",
    itemKey: "discipline",
    emoji: "⚖️",
  },
  {
    href: "/chair/session/timer",
    itemKey: "timer",
    emoji: "⏱️",
  },
  {
    href: "/chair/session/announcements",
    itemKey: "announcements",
    emoji: "📣",
  },
  { href: "/voting", itemKey: "voting", emoji: "🗳️" },
  { href: "/chair/awards", itemKey: "score", emoji: "📊" },
  { href: "/report", itemKey: "crisis", emoji: "⚠️", crisisOnly: true },
  { href: "/crisis-slides", itemKey: "crisisSlides", emoji: "🖼️", crisisOnly: true },
  { href: "/documents", itemKey: "archive", emoji: "📁" },
  { href: "/official-links", itemKey: "officialLinks", emoji: "🔗" },
  { href: "/chair/room-code", itemKey: "roomCode", emoji: "🚪" },
  { href: "/profile", itemKey: "settings", emoji: "⚙️", activeMatch: "/profile" },
];

function navItemIsActive(pathname: string, item: ChairNavItem): boolean {
  if (item.exactHref) {
    return pathname === item.href;
  }
  const key = item.activeMatch ?? item.href;
  if (key === "/profile") {
    return pathname === "/profile";
  }
  return pathname === key || pathname.startsWith(`${key}/`);
}

function ChairNavRow({
  item,
  label,
  isActive,
  labelsHidden,
}: {
  item: ChairNavItem;
  label: string;
  isActive: boolean;
  labelsHidden: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={labelsHidden ? label : undefined}
      className={cn(
        "discord-interactive-hover flex w-full min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-apple",
        labelsHidden && "h-11 w-full justify-center gap-1.5 px-2 py-0",
        isActive
          ? "bg-[var(--accent)] font-semibold text-white"
          : "border border-transparent font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]"
      )}
    >
      <span className="flex shrink-0 items-center" aria-hidden>
        <span className="text-base leading-none">{item.emoji}</span>
      </span>
      {!labelsHidden ? <span className="min-w-0 truncate">{label}</span> : null}
    </Link>
  );
}

function filterChairNavItems(items: ChairNavItem[], crisisReportingEnabled: boolean) {
  return items.filter((item) => !item.crisisOnly || crisisReportingEnabled);
}

export function ChairDashboardSidebar({
  conferenceLine,
  crisisReportingEnabled,
}: {
  conferenceLine: string;
  crisisReportingEnabled: boolean;
}) {
  const t = useTranslations("chairNav");
  const tItems = useTranslations("chairNav.items");
  const pathname = usePathname();
  const [labelsHidden, setLabelsHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(LABELS_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleLabels = useCallback(() => {
    setLabelsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LABELS_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const headerText = conferenceLine.trim() || t("committeeTopicFallback");
  const hubActive = pathname === "/chair";
  const navItems = useMemo(
    () => filterChairNavItems(CHAIR_NAV_ITEMS, crisisReportingEnabled),
    [crisisReportingEnabled]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("shrink-0 px-3 pt-3 pb-2", labelsHidden && "px-2")}>
        <Link
          href="/chair"
          title={headerText}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-apple hover:opacity-95",
            labelsHidden && "mx-auto h-11 w-full rounded-[var(--radius-lg)] px-2 py-0",
            hubActive && "ring-2 ring-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)]"
          )}
        >
          <span className="text-base leading-none" aria-hidden>
            📌
          </span>
          {!labelsHidden ? <span className="min-w-0 truncate">{headerText}</span> : null}
          {labelsHidden ? <span className="sr-only">{headerText}</span> : null}
        </Link>
      </div>

      <nav
        aria-label={t("ariaDashboard")}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-1 [scrollbar-width:thin]",
          labelsHidden ? "px-1.5" : "px-3"
        )}
      >
        {navItems.map((item) => (
          <ChairNavRow
            key={item.href + item.itemKey}
            item={item}
            label={item.labelOverride ?? tItems(item.itemKey)}
            isActive={navItemIsActive(pathname, item)}
            labelsHidden={labelsHidden}
          />
        ))}
      </nav>

      <div
        className={cn(
          "mt-auto shrink-0 space-y-0.5 border-t border-[var(--hairline)] py-3",
          labelsHidden ? "px-1.5" : "px-3"
        )}
      >
        <button
          type="button"
          onClick={toggleLabels}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-medium text-brand-muted transition-apple hover:bg-[color:var(--discord-hover-bg)]",
            labelsHidden && "justify-center px-2"
          )}
        >
          <span className="text-base leading-none" aria-hidden>
            ↔️
          </span>
          {!labelsHidden ? <span>{t("hideLabels")}</span> : <span className="sr-only">{t("showLabels")}</span>}
        </button>
        <Link
          href="/guides"
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-brand-muted transition-apple hover:bg-[color:var(--discord-hover-bg)]",
            labelsHidden && "justify-center px-2"
          )}
        >
          <span className="text-base leading-none" aria-hidden>
            ❓
          </span>
          {!labelsHidden ? t("helpCenter") : <span className="sr-only">{t("helpCenter")}</span>}
        </Link>
      </div>
    </div>
  );
}

function DockItem({
  item,
  label,
  isActive,
  labelsHidden,
}: {
  item: ChairNavItem;
  label: string;
  isActive: boolean;
  labelsHidden: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={label}
      className="group flex shrink-0 snap-start flex-col items-center gap-0.5 px-1 py-1.5 transition-apple active:scale-[0.97]"
    >
      <span
        className={cn(
          "flex h-8 min-w-8 items-center justify-center text-brand-muted",
          isActive && "text-[var(--accent)]"
        )}
      >
        <span className="text-sm leading-none" aria-hidden>
          {item.emoji}
        </span>
      </span>
      {!labelsHidden ? (
        <span
          className={cn(
            "max-w-[4.5rem] text-center text-[0.625rem] font-medium leading-tight",
            isActive ? "font-semibold text-[var(--accent)]" : "text-brand-muted"
          )}
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}

export function ChairMobileDock({
  conferenceLine,
  crisisReportingEnabled,
}: {
  conferenceLine: string;
  crisisReportingEnabled: boolean;
}) {
  const t = useTranslations("chairNav");
  const tItems = useTranslations("chairNav.items");
  const pathname = usePathname();
  const [labelsHidden, setLabelsHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(LABELS_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleLabels = useCallback(() => {
    setLabelsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LABELS_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const hubActive = pathname === "/chair";
  const navItems = useMemo(
    () => filterChairNavItems(CHAIR_NAV_ITEMS, crisisReportingEnabled),
    [crisisReportingEnabled]
  );

  return (
    <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto max-w-2xl overflow-x-auto overscroll-x-contain rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-chrome)] px-2 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-0.5 overflow-x-auto">
        <Link
          href="/chair"
          className="flex shrink-0 snap-start flex-col items-center gap-0.5 px-1 py-1.5 transition-apple active:scale-[0.97]"
          title={conferenceLine || t("committeeHub")}
        >
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] text-lg text-white",
              hubActive && "ring-2 ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)]"
            )}
          >
            📌
          </span>
          {!labelsHidden ? (
            <span className="max-w-[4rem] text-center text-[0.625rem] font-semibold leading-tight text-[var(--accent)]">
              {t("committeeHub")}
            </span>
          ) : null}
        </Link>
        {navItems.map((item) => (
          <DockItem
            key={item.href + item.itemKey}
            item={item}
            label={item.labelOverride ?? tItems(item.itemKey)}
            isActive={navItemIsActive(pathname, item)}
            labelsHidden={labelsHidden}
          />
        ))}
        <button
          type="button"
          onClick={toggleLabels}
          title={labelsHidden ? t("showLabels") : t("hideLabels")}
          className="flex shrink-0 snap-start flex-col items-center gap-0.5 px-1 py-1.5 text-brand-muted transition-apple"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)]">
            <span className="text-sm leading-none" aria-hidden>
              ↔️
            </span>
          </span>
          {!labelsHidden ? (
            <span className="max-w-[4rem] text-center text-[0.625rem] font-medium leading-tight">{t("labelsDock")}</span>
          ) : null}
        </button>
        </div>
      </div>
    </div>
  );
}
