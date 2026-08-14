// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { NavFolder, NavFolderDockTabs, useNavFolderExpansion } from "@/components/nav/NavFolder";
import {
  TAB_NAV_FOLDER_ORDER,
  folderHasActiveChild,
  groupNavByFolder,
  tabHrefFolder,
  type NavFolderId,
} from "@/lib/nav-folder-groups";
import {
  ADVISOR_TAB_NAV_HREF_ORDER,
  CHAIR_STAFF_TAB_NAV_HREF_ORDER,
  DELEGATE_TAB_NAV_HREF_ORDER,
  sortNavByHrefPriority,
  withSequentialPriority,
} from "@/lib/nav-priority-order";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

/** One emoji per tab; none repeat, and none match folder emojis 🏠 🧠 📖. */
const NAV_EMOJIS: Record<string, string> = {
  "/delegate": "🌐",
  "/profile": "👤",
  "/chats-notes": "💬",
  "/committee-room": "🏛️",
  "/history": "🕘",
  "/newsroom": "🗞️",
  "/press-corps": "📸",
  "/milestones": "🏅",
  "/voting": "🗳️",
  "/guides": "📘",
  "/documents": "📁",
  "/stances": "🧭",
  "/ideas": "💡",
  "/sources": "📎",
  "/resolutions": "📄",
  "/amendments": "✏️",
  "/speeches": "🎤",
  "/running-notes": "🗒️",
  "/report": "🚩",
  "/crisis": "⚡",
  "/crisis-slides": "🖼️",
  "/advisor": "🎓",
  "/advisor/notes": "📨",
  "/advisor/schedule": "🗓️",
  "/delegate/schedule": "📅",
  "/chair/room-code": "🚪",
  "/chair/session": "🛡️",
  "/smt/allocation-passwords": "🔐",
  "/chair/allocation-matrix": "🧩",
  "/chair/awards": "🏆",
};

const BASE_TABS = [
  { href: "/delegate", labelKey: "delegateHub" },
  { href: "/profile", labelKey: "profile" },
  { href: "/chats-notes", labelKey: "notes" },
  { href: "/committee-room", labelKey: "committee" },
  { href: "/history", labelKey: "history" },
  { href: "/newsroom", labelKey: "newsroom" },
  { href: "/press-corps", labelKey: "pressCorps" },
  { href: "/milestones", labelKey: "milestones" },
  { href: "/voting", labelKey: "voting" },
  { href: "/guides", labelKey: "guides" },
  { href: "/documents", labelKey: "documents" },
  { href: "/stances", labelKey: "stances" },
  { href: "/ideas", labelKey: "ideas" },
  { href: "/sources", labelKey: "sources" },
  { href: "/resolutions", labelKey: "resolutions" },
  { href: "/amendments", labelKey: "amendments" },
  { href: "/speeches", labelKey: "speeches" },
  { href: "/running-notes", labelKey: "running" },
  { href: "/report", labelKey: "report" },
  { href: "/crisis-slides", labelKey: "crisisSlides" },
] as const;

const CRISIS_ONLY_HREFS = new Set<string>(["/report", "/crisis-slides", "/crisis"]);

const ADVISOR_BLOCKED_HREFS = new Set<string>(["/chats-notes", "/running-notes", "/stances"]);

const SCHEDULE_TAB = { labelKey: "conferenceSchedule" as const };

function scheduleHrefForRole(role: UserRole | null): string | null {
  if (role === "advisor") return "/advisor/schedule";
  return "/delegate/schedule";
}

function emojiForHref(href: string): string {
  return NAV_EMOJIS[href] ?? "▫️";
}

function useNavTabs(
  staffRole: UserRole | null | undefined,
  crisisReportingEnabled: boolean,
  seamunScheduleEnabled: boolean
) {
  const role = staffRole ?? null;
  const baseTabs = crisisReportingEnabled
    ? [...BASE_TABS]
    : BASE_TABS.filter((t) => !CRISIS_ONLY_HREFS.has(t.href));

  const roleTabs =
    role === "chair"
      ? baseTabs.map((t) =>
          t.href === "/crisis-slides" ? { href: "/crisis", labelKey: "crisis" as const } : t
        )
      : baseTabs;

  const scheduleTab =
    seamunScheduleEnabled && role !== "chair" && role !== "smt" && role !== "admin"
      ? [{ href: scheduleHrefForRole(role)!, ...SCHEDULE_TAB }]
      : [];

  if (role === "advisor") {
    return [
      { href: "/advisor", labelKey: "advisorHub" },
      { href: "/advisor/notes", labelKey: "advisorNotes" },
      ...scheduleTab,
      ...roleTabs
        .filter((t) => t.href !== "/delegate" && !ADVISOR_BLOCKED_HREFS.has(t.href))
        .map((t) => (t.href === "/profile" ? t : t)),
    ];
  }

  return role === "chair" || role === "smt" || role === "admin"
    ? [
        ...roleTabs.slice(0, 3),
        { href: "/chair/room-code", labelKey: "committeeCode" },
        ...(role === "chair"
          ? ([{ href: "/chair/session", labelKey: "session" }] as const)
          : []),
        ...(role === "smt" || role === "admin"
          ? ([{ href: "/smt/allocation-passwords", labelKey: "passwords" }] as const)
          : []),
        { href: "/chair/allocation-matrix", labelKey: "matrix" },
        { href: "/chair/awards", labelKey: "awards" },
        ...roleTabs.slice(3),
      ]
    : [
        roleTabs[0]!,
        ...scheduleTab,
        ...roleTabs.slice(1),
      ];
}

function tabInPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AspireSidebarLink({
  tab,
  label,
  isActive,
  priority,
}: {
  tab: { href: string; labelKey: string };
  label: string;
  isActive: boolean;
  priority: number;
}) {
  const emoji = emojiForHref(tab.href);
  return (
    <Link
      href={tab.href}
      aria-label={label}
      data-tour={`nav-${tab.labelKey}`}
      className={cn(
        "nav-priority-link--rail flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-apple group-hover:justify-start group-hover:gap-3 group-hover:px-2.5",
        isActive
          ? "dashboard-nav-active font-semibold"
          : "font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,#ffffff)]"
      )}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="hidden truncate group-hover:block">{label}</span>
    </Link>
  );
}

function DockLink({
  tab,
  label,
  isActive,
  priority,
}: {
  tab: { href: string; labelKey: string };
  label: string;
  isActive: boolean;
  priority: number;
}) {
  const emoji = emojiForHref(tab.href);
  return (
    <Link
      href={tab.href}
      title={`${priority}. ${label}`}
      aria-label={`${priority}. ${label}`}
      data-tour={`nav-${tab.labelKey}`}
        className={cn(
          "nav-priority-link nav-priority-link--dock group flex shrink-0 snap-start flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-all duration-300 active:scale-[0.97]",
          isActive && "bg-[color:color-mix(in_srgb,var(--accent)_10%,white)] shadow-[inset_0_1px_3px_rgba(15,23,42,0.12)]"
        )}
    >
      <NavPriorityBadge priority={priority} />
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center text-base leading-none transition-apple",
          isActive && "text-[var(--accent)]"
        )}
        aria-hidden
      >
        {emoji}
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

export function TabNav({
  staffRole = null,
  variant,
  crisisReportingEnabled = true,
  seamunScheduleEnabled = false,
}: {
  staffRole?: UserRole | null;
  variant: "aspire-sidebar" | "dock";
  /** When false, hide crisis routes (`/report`, `/crisis-slides`, `/crisis`). */
  crisisReportingEnabled?: boolean;
  /** SEAMUN I 2027 locked timetable link in sidebar/dock. */
  seamunScheduleEnabled?: boolean;
}) {
  const t = useTranslations("tabNav");
  const pathname = usePathname();
  const rawTabs = useNavTabs(staffRole, crisisReportingEnabled, seamunScheduleEnabled);
  const hrefOrder =
    staffRole === "advisor"
      ? ADVISOR_TAB_NAV_HREF_ORDER
      : staffRole === "chair" || staffRole === "smt" || staffRole === "admin"
        ? CHAIR_STAFF_TAB_NAV_HREF_ORDER
        : DELEGATE_TAB_NAV_HREF_ORDER;
  const tabs = useMemo(
    () => withSequentialPriority(sortNavByHrefPriority(rawTabs, hrefOrder)),
    [rawTabs, hrefOrder]
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        tabs,
        TAB_NAV_FOLDER_ORDER,
        (tab) => tabHrefFolder(tab.href),
        (a, b) => a.priority - b.priority
      ),
    [tabs]
  );

  const folderIds = useMemo(() => folderGroups.map((g) => g.folderId), [folderGroups]);

  const activeFolderFromPath = useMemo(() => {
    for (const group of folderGroups) {
      if (folderHasActiveChild(group.items, (tab) => tabInPath(pathname, tab.href))) {
        return group.folderId;
      }
    }
    return folderIds[0] ?? "home";
  }, [folderGroups, folderIds, pathname]);

  const [dockFolder, setDockFolder] = useState<NavFolderId>(activeFolderFromPath);
  useEffect(() => {
    setDockFolder(activeFolderFromPath);
  }, [activeFolderFromPath]);

  const dockItems = useMemo(
    () => folderGroups.find((g) => g.folderId === dockFolder)?.items ?? [],
    [folderGroups, dockFolder]
  );

  const { expandedFolderId, onFolderToggle } = useNavFolderExpansion(
    folderGroups,
    (tab) => tabInPath(pathname, tab.href)
  );

  if (variant === "aspire-sidebar") {
    return (
      <nav
        aria-label={t("mainNavigationAria")}
        data-tour="tour-nav"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-2 group-hover:px-3 [scrollbar-width:thin]"
      >
        {folderGroups.map(({ folderId, items }) => (
          <NavFolder
            key={folderId}
            folderId={folderId}
            compact
            expanded={expandedFolderId === folderId}
            hasActiveChild={folderHasActiveChild(items, (tab) => tabInPath(pathname, tab.href))}
            onToggle={() => onFolderToggle(folderId)}
          >
            {items.map((tab) => (
              <AspireSidebarLink
                key={tab.href}
                tab={tab}
                label={t(tab.labelKey)}
                isActive={tabInPath(pathname, tab.href)}
                priority={tab.priority}
              />
            ))}
          </NavFolder>
        ))}
      </nav>
    );
  }

  return (
    <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <nav
        aria-label={t("mainNavigationAria")}
        className="mx-auto max-w-2xl overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-[var(--hairline)] bg-[var(--dashboard-card)] px-2 py-2.5 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] dark:bg-[var(--material-chrome)]"
      >
        <div className="flex min-w-full flex-col gap-1.5">
          {folderIds.length > 1 ? (
            <NavFolderDockTabs folders={folderIds} activeFolderId={dockFolder} onSelect={setDockFolder} />
          ) : null}
          <div className="flex flex-row items-stretch gap-0.5 overflow-x-auto px-0.5 pb-0.5">
            {dockItems.map((tab) => (
              <DockLink
                key={tab.href}
                tab={tab}
                label={t(tab.labelKey)}
                isActive={tabInPath(pathname, tab.href)}
                priority={tab.priority}
              />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
