"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpen,
  CheckSquare,
  ClipboardList,
  Clock,
  DoorOpen,
  FileText,
  Gavel,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  Link2,
  ListChecks,
  Megaphone,
  Mic,
  PanelLeftClose,
  Play,
  Presentation,
  Settings,
  TriangleAlert,
  Users,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS_STORAGE_KEY = "intermun-chair-nav-hide-labels";

type ChairNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
  /** If set, active when pathname === or starts with this */
  activeMatch?: string;
  /** When true, active only on exact `href` (no `/child` match). */
  exactHref?: boolean;
  /** Shown only for FWC / UNSC / HSC committees. */
  crisisOnly?: boolean;
};

/** Order aligned with [SEAMUNs Chair Room](https://thedashboard.seamuns.site/chair); InterMUN-only items follow Official links. */
const CHAIR_NAV_ITEMS: ChairNavItem[] = [
  { href: "/chair/prep-checklist", label: "Prep checklist", icon: ListChecks, emoji: "✅" },
  { href: "/chair/flow-checklist", label: "Flow checklist", icon: ClipboardList, emoji: "📋" },
  { href: "/chair/allocation-matrix", label: "Delegates", icon: Users, emoji: "👥" },
  { href: "/chair/digital-room", label: "Digital Room", icon: LayoutGrid, emoji: "🖥️" },
  {
    href: "/chair/session/roll-call",
    label: "Roll Call",
    icon: UserCheck,
    emoji: "✅",
  },
  {
    href: "/chair/session",
    label: "Session",
    icon: Play,
    emoji: "▶️",
    exactHref: true,
  },
  {
    href: "/chair/session/speakers",
    label: "Speakers",
    icon: Mic,
    emoji: "🎤",
  },
  {
    href: "/chair/session/motions",
    label: "Formal motions",
    icon: Gavel,
    emoji: "📜",
  },
  {
    href: "/chair/session/timer",
    label: "Timer",
    icon: Clock,
    emoji: "⏱️",
  },
  {
    href: "/chair/session/announcements",
    label: "Announcements",
    icon: Megaphone,
    emoji: "📣",
  },
  {
    href: "/chair/motions-points",
    label: "Motions & Points",
    icon: FileText,
    emoji: "📜",
  },
  { href: "/voting", label: "Voting", icon: CheckSquare, emoji: "🗳️" },
  { href: "/chair/awards", label: "Score", icon: BarChart3, emoji: "📊" },
  { href: "/report", label: "Crisis", icon: TriangleAlert, emoji: "⚠️", crisisOnly: true },
  { href: "/crisis-slides", label: "Crisis slides", icon: Presentation, emoji: "🖼️", crisisOnly: true },
  { href: "/documents", label: "Archive", icon: Archive, emoji: "📁" },
  { href: "/official-links", label: "Official links", icon: Link2, emoji: "🔗" },
  { href: "/chair/room-code", label: "Room code", icon: DoorOpen, emoji: "🚪" },
  { href: "/chair/allocation-passwords", label: "Sign-in passwords", icon: KeyRound, emoji: "🔑" },
  { href: "/profile", label: "Settings", icon: Settings, emoji: "⚙️", activeMatch: "/profile" },
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
  isActive,
  labelsHidden,
}: {
  item: ChairNavItem;
  isActive: boolean;
  labelsHidden: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={labelsHidden ? item.label : undefined}
      className={cn(
        "discord-interactive-hover flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
        labelsHidden && "h-11 w-full justify-center gap-1.5 px-2 py-0",
        isActive
          ? "border border-brand-accent/35 bg-brand-accent/10 font-semibold text-slate-900 shadow-sm dark:border-brand-accent/40 dark:bg-brand-accent/15 dark:text-zinc-50"
          : "border border-transparent font-medium text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800/90"
      )}
    >
      <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
        <Icon
          className={cn(
            "h-[1.15rem] w-[1.15rem] shrink-0",
            isActive ? "text-brand-accent dark:text-brand-accent-bright" : "text-slate-500 dark:text-zinc-400"
          )}
          strokeWidth={1.75}
        />
        <span className="text-base leading-none">{item.emoji}</span>
      </span>
      {!labelsHidden ? <span className="min-w-0 truncate">{item.label}</span> : null}
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
  const pathname = usePathname();
  const [labelsHidden, setLabelsHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LABELS_STORAGE_KEY) === "1") setLabelsHidden(true);
    } catch {
      /* ignore */
    }
  }, []);

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

  const headerText =
    conferenceLine.trim() || "Committee & topic";
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
            "flex w-full items-center justify-center gap-2 rounded-full bg-brand-accent px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-90 dark:bg-discord-blurple dark:hover:bg-discord-blurple-hover dark:hover:opacity-100",
            labelsHidden && "mx-auto h-11 w-full rounded-xl px-2 py-0",
            hubActive &&
              "ring-2 ring-brand-accent/45 ring-offset-2 ring-offset-white dark:ring-discord-blurple/50 dark:ring-offset-discord-sidebar"
          )}
        >
          <BookOpen
            className={cn("shrink-0 opacity-95", labelsHidden ? "h-5 w-5" : "h-4 w-4")}
            strokeWidth={labelsHidden ? 1.9 : 1.75}
            aria-hidden
          />
          <span className="text-base leading-none" aria-hidden>
            📌
          </span>
          {!labelsHidden ? <span className="min-w-0 truncate">{headerText}</span> : null}
          {labelsHidden ? <span className="sr-only">{headerText}</span> : null}
        </Link>
      </div>

      <nav
        aria-label="Chair dashboard"
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-1 [scrollbar-width:thin]",
          labelsHidden ? "px-1.5" : "px-3"
        )}
      >
        {navItems.map((item) => (
          <ChairNavRow
            key={item.href + item.label}
            item={item}
            isActive={navItemIsActive(pathname, item)}
            labelsHidden={labelsHidden}
          />
        ))}
      </nav>

      <div
        className={cn(
          "mt-auto shrink-0 space-y-0.5 border-t border-slate-100 py-3 dark:border-zinc-800",
          labelsHidden ? "px-1.5" : "px-3"
        )}
      >
        <button
          type="button"
          onClick={toggleLabels}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90",
            labelsHidden && "justify-center px-2"
          )}
        >
          <PanelLeftClose className="h-5 w-5 shrink-0 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
          {!labelsHidden ? <span>Hide labels</span> : <span className="sr-only">Show labels</span>}
        </button>
        <Link
          href="/guides"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90",
            labelsHidden && "justify-center px-2"
          )}
        >
          <HelpCircle className="h-5 w-5 shrink-0 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
          {!labelsHidden ? "Help center" : <span className="sr-only">Help center</span>}
        </Link>
      </div>
    </div>
  );
}

function DockItem({
  item,
  isActive,
  labelsHidden,
}: {
  item: ChairNavItem;
  isActive: boolean;
  labelsHidden: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className="group flex shrink-0 snap-start flex-col items-center gap-1 px-1 py-2"
    >
      <span
        className={cn(
          "flex h-11 min-w-[2.75rem] items-center justify-center gap-0.5 rounded-xl border px-1.5 shadow-sm transition-all duration-200",
          isActive
            ? "border-brand-accent/40 bg-brand-accent/10 text-slate-900 dark:border-brand-accent/45 dark:bg-brand-accent/15 dark:text-zinc-50"
            : "border-slate-200/90 bg-white text-slate-600 group-hover:border-brand-accent/25 group-hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-800"
        )}
      >
        <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" strokeWidth={1.75} />
        <span className="text-sm leading-none" aria-hidden>
          {item.emoji}
        </span>
      </span>
      {!labelsHidden ? (
        <span
          className={cn(
            "max-w-[4.5rem] text-center text-[0.625rem] font-medium leading-tight",
            isActive ? "text-brand-accent dark:text-brand-accent-bright" : "text-slate-600 dark:text-zinc-400"
          )}
        >
          {item.label}
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
  const pathname = usePathname();
  const [labelsHidden, setLabelsHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LABELS_STORAGE_KEY) === "1") setLabelsHidden(true);
    } catch {
      /* ignore */
    }
  }, []);

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
    <div className="border-t border-slate-200/80 bg-brand-cream/95 backdrop-blur-md dark:border-discord-divider dark:bg-discord-sidebar/98 dark:backdrop-blur-md">
      <div className="flex items-center gap-1 overflow-x-auto overscroll-x-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/chair"
          className="flex shrink-0 snap-start flex-col items-center gap-1 px-1 py-2"
          title={conferenceLine || "Committee"}
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent text-lg text-white shadow-sm",
              hubActive &&
                "ring-2 ring-brand-silver/80 ring-offset-2 ring-offset-brand-cream dark:ring-brand-silver/70 dark:ring-offset-[#121212]"
            )}
          >
            📌
          </span>
          {!labelsHidden ? (
            <span className="max-w-[4rem] text-center text-[0.625rem] font-semibold leading-tight text-brand-accent dark:text-brand-accent-bright">
              Committee
            </span>
          ) : null}
        </Link>
        {navItems.map((item) => (
          <DockItem
            key={item.href + item.label}
            item={item}
            isActive={navItemIsActive(pathname, item)}
            labelsHidden={labelsHidden}
          />
        ))}
        <button
          type="button"
          onClick={toggleLabels}
          title={labelsHidden ? "Show labels" : "Hide labels"}
          className="flex shrink-0 snap-start flex-col items-center gap-1 px-1 py-2 text-slate-500 dark:text-zinc-400"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/90 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <PanelLeftClose className="h-5 w-5" strokeWidth={1.75} />
          </span>
          {!labelsHidden ? (
            <span className="max-w-[4rem] text-center text-[0.625rem] font-medium leading-tight">Labels</span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
