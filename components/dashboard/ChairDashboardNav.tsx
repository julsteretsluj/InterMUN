// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { NavFolder, NavFolderDockTabs, useNavFolderExpansion } from "@/components/nav/NavFolder";
import {
  CHAIR_ITEM_FOLDER,
  CHAIR_NAV_FOLDER_ORDER,
  folderHasActiveChild,
  groupNavByFolder,
  type NavFolderId,
} from "@/lib/nav-folder-groups";
import {
  CHAIR_NAV_ITEM_KEY_ORDER,
  sortByKeyPriority,
} from "@/lib/nav-priority-order";
import { cn } from "@/lib/utils";

const LABELS_STORAGE_KEY = "intermun-chair-nav-hide-labels";

export type ChairNavItemKey =
  | "prepChecklist"
  | "flowChecklist"
  | "delegates"
  | "conferenceSchedule"
  | "digitalRoom"
  | "history"
  | "newsroom"
  | "pressCorps"
  | "milestones"
  | "guides"
  | "rollCall"
  | "session"
  | "agenda"
  | "speakers"
  | "formalMotions"
  | "resolutions"
  | "amendments"
  | "discipline"
  | "timer"
  | "announcements"
  | "voting"
  | "score"
  | "crisis"
  | "crisisReport"
  | "archive"
  | "officialLinks"
  | "notesModeration"
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
  /** Shown only for FWC / UNSC committees. */
  crisisOnly?: boolean;
};

/** Primary tab order follows chair workflow sequence requested by product. */
const CHAIR_NAV_ITEMS: ChairNavItem[] = [
  { href: "/chair/prep-checklist", itemKey: "prepChecklist", emoji: "✅" },
  {
    href: "/chair/session/announcements",
    itemKey: "announcements",
    emoji: "📣",
  },
  {
    href: "/chair/session/agenda",
    itemKey: "agenda",
    emoji: "📑",
  },
  { href: "/chair/allocation-matrix", itemKey: "delegates", emoji: "👥" },
  { href: "/chair/schedule", itemKey: "conferenceSchedule", emoji: "📅" },
  { href: "/chair/flow-checklist", itemKey: "flowChecklist", emoji: "🗂️" },
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
  { href: "/chair/digital-room", itemKey: "digitalRoom", emoji: "🖥️" },
  { href: "/history", itemKey: "history", emoji: "🕘" },
  { href: "/newsroom", itemKey: "newsroom", emoji: "📰" },
  { href: "/press-corps", itemKey: "pressCorps", emoji: "📸" },
  { href: "/milestones", itemKey: "milestones", emoji: "🏅" },
  { href: "/guides", itemKey: "guides", emoji: "📘" },
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
  { href: "/resolutions", itemKey: "resolutions", emoji: "📄" },
  { href: "/amendments", itemKey: "amendments", emoji: "✏️" },
  {
    href: "/chair/session/timer",
    itemKey: "timer",
    emoji: "⏱️",
  },
  { href: "/voting", itemKey: "voting", emoji: "🗳️" },
  { href: "/chair/awards", itemKey: "score", emoji: "📊" },
  {
    href: "/chair/session/discipline",
    itemKey: "discipline",
    emoji: "⚖️",
  },
  { href: "/documents", itemKey: "archive", emoji: "📁" },
  { href: "/chair/notes-moderation", itemKey: "notesModeration", emoji: "📝" },
  { href: "/official-links", itemKey: "officialLinks", emoji: "🔗" },
  { href: "/crisis", itemKey: "crisis", emoji: "⚠️", crisisOnly: true },
  { href: "/report", itemKey: "crisisReport", emoji: "🚨", crisisOnly: true },
  { href: "/chair/room-code", itemKey: "roomCode", emoji: "🚪" },
  { href: "/profile", itemKey: "settings", emoji: "👤", activeMatch: "/profile" },
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
  priority,
  badgeCount,
}: {
  item: ChairNavItem;
  label: string;
  isActive: boolean;
  labelsHidden: boolean;
  priority: number;
  badgeCount?: number;
}) {
  return (
    <Link
      href={item.href}
      title={labelsHidden ? label : undefined}
      aria-label={label}
      className={cn(
        "nav-priority-link--rail discord-interactive-hover relative flex w-full min-w-0 items-center rounded-lg py-2 text-sm transition-all duration-300",
        labelsHidden
          ? "h-11 justify-center gap-0 px-2"
          : "justify-center gap-1.5 px-2 group-hover:justify-start group-hover:gap-3 group-hover:pl-2.5 group-hover:pr-2.5",
        isActive
          ? "dashboard-nav-active"
          : "border border-transparent font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,#ffffff)]"
      )}
    >
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent transition-apple",
          isActive
            ? "border-[color:color-mix(in_srgb,var(--accent)_18%,var(--hairline))] bg-white/70 shadow-[inset_0_1px_3px_rgba(15,23,42,0.12)]"
            : "bg-[color:color-mix(in_srgb,var(--color-text)_4%,#ffffff)]"
        )}
        aria-hidden
      >
        <span className="text-base leading-none">{item.emoji}</span>
      </span>
      {!labelsHidden ? (
        <span className="hidden min-w-0 flex-1 items-center gap-2 group-hover:flex">
          <span className="min-w-0 truncate">{label}</span>
          {badgeCount && badgeCount > 0 ? (
            <span className="ml-auto inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </span>
      ) : badgeCount && badgeCount > 0 ? (
        <span className="absolute right-1 top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function filterChairNavItems(items: ChairNavItem[], crisisReportingEnabled: boolean) {
  return items.filter((item) => !item.crisisOnly || crisisReportingEnabled);
}

export function ChairDashboardSidebar({
  conferenceLine,
  crisisReportingEnabled,
  seamunScheduleEnabled = false,
  heldNotesCount = 0,
}: {
  conferenceLine: string;
  crisisReportingEnabled: boolean;
  seamunScheduleEnabled?: boolean;
  heldNotesCount?: number;
}) {
  const t = useTranslations("chairNav");
  const tItems = useTranslations("chairNav.items");
  const pathname = usePathname();
  const [labelsHidden, setLabelsHidden] = useState(false);

  useEffect(() => {
    // Deferred a frame so hydration-safe defaults render first, without a sync cascade.
    const frame = window.requestAnimationFrame(() => {
      try {
        setLabelsHidden(localStorage.getItem(LABELS_STORAGE_KEY) === "1");
      } catch {
        setLabelsHidden(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
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

  const headerText = conferenceLine.trim() || t("committeeTopicFallback");
  const hubActive = pathname === "/chair";
  const navItems = useMemo(() => {
    const items = filterChairNavItems(CHAIR_NAV_ITEMS, crisisReportingEnabled);
    const filtered = seamunScheduleEnabled
      ? items
      : items.filter((item) => item.itemKey !== "conferenceSchedule");
    return sortByKeyPriority(filtered, "itemKey", CHAIR_NAV_ITEM_KEY_ORDER);
  }, [crisisReportingEnabled, seamunScheduleEnabled]);

  const priorityByKey = useMemo(
    () => new Map(navItems.map((item, index) => [item.itemKey, index + 1])),
    [navItems]
  );

  const compareNavItems = useCallback(
    (a: ChairNavItem, b: ChairNavItem) => {
      const pa = priorityByKey.get(a.itemKey) ?? 9999;
      const pb = priorityByKey.get(b.itemKey) ?? 9999;
      return pa - pb;
    },
    [priorityByKey]
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        navItems,
        CHAIR_NAV_FOLDER_ORDER,
        (item) => CHAIR_ITEM_FOLDER[item.itemKey] ?? "session",
        compareNavItems
      ),
    [navItems, compareNavItems]
  );

  const { expandedFolderId, onFolderToggle } = useNavFolderExpansion(
    folderGroups,
    (item) => navItemIsActive(pathname, item)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("shrink-0 px-2 pt-3 pb-2 group-hover:px-3", labelsHidden && "px-2")}>
        <Link
          href="/chair"
          title={headerText}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--accent)] px-2 py-2 text-center text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-apple hover:opacity-95 group-hover:justify-start group-hover:gap-2 group-hover:px-4 group-hover:py-2.5",
            labelsHidden && "mx-auto h-11 w-full rounded-[var(--radius-lg)] px-2 py-0",
            hubActive && "ring-2 ring-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)]"
          )}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
            📌
          </span>
          {!labelsHidden ? (
            <span className="hidden min-w-0 truncate group-hover:inline">{headerText}</span>
          ) : null}
          {labelsHidden ? <span className="sr-only">{headerText}</span> : null}
        </Link>
      </div>

      <nav
        aria-label={t("ariaDashboard")}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:thin]",
          labelsHidden ? "px-2" : "px-2 group-hover:px-3"
        )}
      >
        {folderGroups.map(({ folderId, items }) => (
          <NavFolder
            key={folderId}
            folderId={folderId}
            compact={!labelsHidden}
            labelsHidden={labelsHidden}
            expanded={expandedFolderId === folderId}
            hasActiveChild={folderHasActiveChild(items, (item) => navItemIsActive(pathname, item))}
            onToggle={() => onFolderToggle(folderId)}
          >
            {items.map((item) => (
              <ChairNavRow
                key={item.href + item.itemKey}
                item={item}
                label={item.labelOverride ?? tItems(item.itemKey)}
                isActive={navItemIsActive(pathname, item)}
                labelsHidden={labelsHidden}
                priority={priorityByKey.get(item.itemKey) ?? 0}
                badgeCount={item.itemKey === "notesModeration" ? heldNotesCount : undefined}
              />
            ))}
          </NavFolder>
        ))}
      </nav>

      <div
        className={cn(
          "mt-auto shrink-0 space-y-1 border-t border-[var(--hairline)] py-3",
          labelsHidden ? "px-2" : "px-2 group-hover:px-3"
        )}
      >
        <button
          type="button"
          onClick={toggleLabels}
          className={cn(
            "flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left text-sm font-medium text-brand-muted transition-apple hover:bg-[color:var(--discord-hover-bg)] group-hover:justify-start group-hover:px-3",
            labelsHidden && "justify-center px-2"
          )}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
            ↔️
          </span>
          {!labelsHidden ? (
            <span className="hidden group-hover:inline">{t("hideLabels")}</span>
          ) : (
            <span className="sr-only">{t("showLabels")}</span>
          )}
        </button>
        <Link
          href="/guides"
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium text-brand-muted transition-apple hover:bg-[color:var(--discord-hover-bg)] group-hover:justify-start group-hover:px-3",
            labelsHidden && "justify-center px-2"
          )}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
            ❓
          </span>
          {!labelsHidden ? (
            <span className="hidden group-hover:inline">{t("helpCenter")}</span>
          ) : (
            <span className="sr-only">{t("helpCenter")}</span>
          )}
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
  priority,
  badgeCount,
}: {
  item: ChairNavItem;
  label: string;
  isActive: boolean;
  labelsHidden: boolean;
  priority: number;
  badgeCount?: number;
}) {
  return (
    <Link
      href={item.href}
      title={`${priority}. ${label}`}
      aria-label={`${priority}. ${label}`}
      className="nav-priority-link nav-priority-link--dock group relative flex shrink-0 snap-start flex-col items-center gap-1 px-1.5 py-2 transition-apple active:scale-[0.97]"
    >
      <NavPriorityBadge priority={priority} />
      <span
        className={cn(
          "relative flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-brand-muted transition-apple",
          isActive &&
            "bg-[color:color-mix(in_srgb,var(--accent)_11%,white)] text-[var(--accent)] shadow-[inset_0_1px_3px_rgba(15,23,42,0.12)]"
        )}
      >
        <span className="text-sm leading-none" aria-hidden>
          {item.emoji}
        </span>
        {badgeCount && badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
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
  seamunScheduleEnabled = false,
  heldNotesCount = 0,
}: {
  conferenceLine: string;
  crisisReportingEnabled: boolean;
  seamunScheduleEnabled?: boolean;
  heldNotesCount?: number;
}) {
  const t = useTranslations("chairNav");
  const tItems = useTranslations("chairNav.items");
  const pathname = usePathname();
  const [labelsHidden, setLabelsHidden] = useState(false);

  useEffect(() => {
    // Deferred a frame so hydration-safe defaults render first, without a sync cascade.
    const frame = window.requestAnimationFrame(() => {
      try {
        setLabelsHidden(localStorage.getItem(LABELS_STORAGE_KEY) === "1");
      } catch {
        setLabelsHidden(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
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
  const navItems = useMemo(() => {
    const items = filterChairNavItems(CHAIR_NAV_ITEMS, crisisReportingEnabled);
    const filtered = seamunScheduleEnabled
      ? items
      : items.filter((item) => item.itemKey !== "conferenceSchedule");
    return sortByKeyPriority(filtered, "itemKey", CHAIR_NAV_ITEM_KEY_ORDER);
  }, [crisisReportingEnabled, seamunScheduleEnabled]);

  const priorityByKey = useMemo(
    () => new Map(navItems.map((item, index) => [item.itemKey, index + 1])),
    [navItems]
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        navItems,
        CHAIR_NAV_FOLDER_ORDER,
        (item) => CHAIR_ITEM_FOLDER[item.itemKey] ?? "session",
        (a, b) => (priorityByKey.get(a.itemKey) ?? 9999) - (priorityByKey.get(b.itemKey) ?? 9999)
      ),
    [navItems, priorityByKey]
  );

  const folderIds = useMemo(() => folderGroups.map((g) => g.folderId), [folderGroups]);

  const activeFolderFromPath = useMemo(() => {
    for (const group of folderGroups) {
      if (folderHasActiveChild(group.items, (item) => navItemIsActive(pathname, item))) {
        return group.folderId;
      }
    }
    return folderIds[0] ?? "session";
  }, [folderGroups, folderIds, pathname]);

  const [dockFolder, setDockFolder] = useState<NavFolderId>(activeFolderFromPath);
  useEffect(() => {
    setDockFolder(activeFolderFromPath);
  }, [activeFolderFromPath]);

  const dockItems = useMemo(
    () => folderGroups.find((g) => g.folderId === dockFolder)?.items ?? [],
    [folderGroups, dockFolder]
  );

  return (
    <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto max-w-2xl overflow-x-auto overscroll-x-contain rounded-2xl border border-[var(--hairline)] bg-[var(--dashboard-card)] px-2 py-2 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] dark:bg-[var(--material-chrome)]">
        <div className="flex min-w-full flex-col gap-1.5">
          {folderIds.length > 1 ? (
            <NavFolderDockTabs folders={folderIds} activeFolderId={dockFolder} onSelect={setDockFolder} />
          ) : null}
          <div className="flex items-center gap-1 overflow-x-auto px-1 py-1">
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
        {dockItems.map((item) => (
          <DockItem
            key={item.href + item.itemKey}
            item={item}
            label={item.labelOverride ?? tItems(item.itemKey)}
            isActive={navItemIsActive(pathname, item)}
            labelsHidden={labelsHidden}
            priority={priorityByKey.get(item.itemKey) ?? 0}
            badgeCount={item.itemKey === "notesModeration" ? heldNotesCount : undefined}
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
    </div>
  );
}
