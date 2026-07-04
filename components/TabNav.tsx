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

const BASE_TABS = [
  { href: "/delegate", labelKey: "delegateHub", emoji: "🏠" },
  { href: "/profile", labelKey: "profile", emoji: "👤" },
  { href: "/chats-notes", labelKey: "notes", emoji: "📝" },
  { href: "/committee-room", labelKey: "committee", emoji: "🏛️" },
  { href: "/history", labelKey: "history", emoji: "🕘" },
  { href: "/newsroom", labelKey: "newsroom", emoji: "📰" },
  { href: "/press-corps", labelKey: "pressCorps", emoji: "📸" },
  { href: "/milestones", labelKey: "milestones", emoji: "🏅" },
  { href: "/voting", labelKey: "voting", emoji: "🗳️" },
  { href: "/guides", labelKey: "guides", emoji: "📚" },
  { href: "/documents", labelKey: "documents", emoji: "📄" },
  { href: "/stances", labelKey: "stances", emoji: "🧭" },
  { href: "/ideas", labelKey: "ideas", emoji: "💡" },
  { href: "/sources", labelKey: "sources", emoji: "🔗" },
  { href: "/resolutions", labelKey: "resolutions", emoji: "✅" },
  { href: "/amendments", labelKey: "amendments", emoji: "✏️" },
  { href: "/speeches", labelKey: "speeches", emoji: "🎤" },
  { href: "/running-notes", labelKey: "running", emoji: "📋" },
  { href: "/report", labelKey: "report", emoji: "🚩" },
  { href: "/crisis-slides", labelKey: "crisisSlides", emoji: "🖼️" },
] as const;

const CRISIS_ONLY_HREFS = new Set<string>(["/report", "/crisis-slides"]);

const ADVISOR_BLOCKED_HREFS = new Set<string>(["/chats-notes", "/running-notes", "/stances"]);

const SCHEDULE_TAB = { labelKey: "conferenceSchedule" as const, emoji: "📅" };

function scheduleHrefForRole(role: UserRole | null): string | null {
  if (role === "advisor") return "/advisor/schedule";
  return "/delegate/schedule";
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

  const scheduleTab =
    seamunScheduleEnabled && role !== "chair" && role !== "smt" && role !== "admin"
      ? [{ href: scheduleHrefForRole(role)!, ...SCHEDULE_TAB }]
      : [];

  if (role === "advisor") {
    return [
      { href: "/advisor", labelKey: "advisorHub", emoji: "🎓" },
      { href: "/advisor/notes", labelKey: "advisorNotes", emoji: "📨" },
      ...scheduleTab,
      ...baseTabs
        .filter((t) => t.href !== "/delegate" && !ADVISOR_BLOCKED_HREFS.has(t.href))
        .map((t) => (t.href === "/profile" ? t : t)),
    ];
  }

  return role === "chair" || role === "smt" || role === "admin"
    ? [
        ...baseTabs.slice(0, 3),
        { href: "/chair/room-code", labelKey: "committeeCode", emoji: "🚪" },
        ...(role === "chair"
          ? ([{ href: "/chair/session", labelKey: "session", emoji: "🧠" }] as const)
          : []),
        ...(role === "smt" || role === "admin"
          ? ([{ href: "/smt/allocation-passwords", labelKey: "passwords", emoji: "🔐" }] as const)
          : []),
        { href: "/chair/allocation-matrix", labelKey: "matrix", emoji: "🔢" },
        { href: "/chair/awards", labelKey: "awards", emoji: "🏆" },
        ...baseTabs.slice(3),
      ]
    : [
        baseTabs[0]!,
        ...scheduleTab,
        ...baseTabs.slice(1),
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
  tab: { href: string; labelKey: string; emoji: string };
  label: string;
  isActive: boolean;
  priority: number;
}) {
  return (
    <Link
      href={tab.href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "nav-priority-link flex w-full min-w-0 items-center justify-center gap-0 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-apple group-hover:justify-start group-hover:gap-3 group-hover:px-2.5 group-hover:pl-8",
        isActive
          ? "dashboard-nav-active font-semibold"
          : "font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,#ffffff)]"
      )}
    >
      <NavPriorityBadge priority={priority} />
      <span className="text-base leading-none" aria-hidden>{tab.emoji}</span>
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
  tab: { href: string; labelKey: string; emoji: string };
  label: string;
  isActive: boolean;
  priority: number;
}) {
  return (
    <Link
      href={tab.href}
      title={`${priority}. ${label}`}
      aria-label={`${priority}. ${label}`}
      className="nav-priority-link nav-priority-link--dock group flex shrink-0 snap-start flex-col items-center gap-0.5 px-1.5 py-1.5 transition-apple active:scale-[0.97]"
    >
      <NavPriorityBadge priority={priority} />
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center text-brand-muted transition-apple",
          isActive && "text-[var(--accent)]"
        )}
      >
        <span className="text-base leading-none" aria-hidden>{tab.emoji}</span>
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
  /** When false, hide `/report` and `/crisis-slides` (crisis committees: FWC, UNSC). */
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
    () => groupNavByFolder(tabs, TAB_NAV_FOLDER_ORDER, (tab) => tabHrefFolder(tab.href)),
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
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 group-hover:px-3 [scrollbar-width:thin]"
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
        className="mx-auto max-w-2xl overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-chrome)] px-2 py-2.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)]"
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
