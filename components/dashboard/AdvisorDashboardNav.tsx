"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { NavFolder, NavFolderDockTabs, useNavFolderExpansion } from "@/components/nav/NavFolder";
import {
  ADVISOR_ITEM_FOLDER,
  ADVISOR_NAV_FOLDER_ORDER,
  folderHasActiveChild,
  groupNavByFolder,
  type NavFolderId,
} from "@/lib/nav-folder-groups";
import {
  ADVISOR_TAB_NAV_HREF_ORDER,
  sortNavByHrefPriority,
} from "@/lib/nav-priority-order";
import { cn } from "@/lib/utils";

type AdvisorNavItem = {
  href: string;
  labelKey: "hub" | "notes" | "schedule" | "newsroom" | "pressCorps" | "milestones" | "profile";
  emoji: string;
};

const ADVISOR_NAV_ITEMS: AdvisorNavItem[] = [
  { href: "/advisor", labelKey: "hub", emoji: "🎓" },
  { href: "/advisor/notes", labelKey: "notes", emoji: "📨" },
  { href: "/advisor/schedule", labelKey: "schedule", emoji: "📅" },
  { href: "/advisor/newsroom", labelKey: "newsroom", emoji: "📰" },
  { href: "/advisor/press-corps", labelKey: "pressCorps", emoji: "📸" },
  { href: "/advisor/milestones", labelKey: "milestones", emoji: "🏅" },
  { href: "/advisor/profile", labelKey: "profile", emoji: "⚙️" },
];

function navItemIsActive(pathname: string, href: string): boolean {
  if (href === "/advisor") return pathname === "/advisor";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdvisorSidebarLink({
  item,
  label,
  isActive,
  priority,
}: {
  item: AdvisorNavItem;
  label: string;
  isActive: boolean;
  priority: number;
}) {
  return (
    <Link
      href={item.href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "nav-priority-link nav-priority-link--rail flex w-full min-w-0 items-center justify-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-apple group-hover:justify-start group-hover:gap-3 group-hover:px-2.5 group-hover:pl-8",
        isActive
          ? "dashboard-nav-active font-semibold"
          : "font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,#ffffff)]"
      )}
    >
      <NavPriorityBadge priority={priority} />
      <span className="text-base leading-none" aria-hidden>
        {item.emoji}
      </span>
      <span className="hidden truncate group-hover:block">{label}</span>
    </Link>
  );
}

function AdvisorDockLink({
  item,
  label,
  isActive,
  priority,
}: {
  item: AdvisorNavItem;
  label: string;
  isActive: boolean;
  priority: number;
}) {
  return (
    <Link
      href={item.href}
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
        <span className="text-base leading-none" aria-hidden>
          {item.emoji}
        </span>
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

export function AdvisorDashboardSidebar() {
  const t = useTranslations("advisorNav");
  const pathname = usePathname();

  const navItems = useMemo(
    () => sortNavByHrefPriority(ADVISOR_NAV_ITEMS, ADVISOR_TAB_NAV_HREF_ORDER),
    []
  );

  const priorityByHref = useMemo(
    () => new Map(navItems.map((item, index) => [item.href, index + 1])),
    [navItems]
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        navItems,
        ADVISOR_NAV_FOLDER_ORDER,
        (item) => ADVISOR_ITEM_FOLDER[item.labelKey] ?? "home",
        (a, b) => (priorityByHref.get(a.href) ?? 9999) - (priorityByHref.get(b.href) ?? 9999)
      ),
    [navItems, priorityByHref]
  );

  const { expandedFolderId, onFolderToggle } = useNavFolderExpansion(
    folderGroups,
    (item) => navItemIsActive(pathname, item.href)
  );

  return (
    <nav
      aria-label={t("ariaDashboard")}
      className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 py-2 group-hover:px-3 [scrollbar-width:thin]"
    >
      {folderGroups.map(({ folderId, items }) => (
        <NavFolder
          key={folderId}
          folderId={folderId}
          compact
          expanded={expandedFolderId === folderId}
          hasActiveChild={folderHasActiveChild(items, (item) => navItemIsActive(pathname, item.href))}
          onToggle={() => onFolderToggle(folderId)}
        >
          {items.map((item) => (
            <AdvisorSidebarLink
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              isActive={navItemIsActive(pathname, item.href)}
              priority={priorityByHref.get(item.href) ?? 0}
            />
          ))}
        </NavFolder>
      ))}
    </nav>
  );
}

export function AdvisorMobileDock() {
  const t = useTranslations("advisorNav");
  const pathname = usePathname();

  const navItems = useMemo(
    () => sortNavByHrefPriority(ADVISOR_NAV_ITEMS, ADVISOR_TAB_NAV_HREF_ORDER),
    []
  );

  const priorityByHref = useMemo(
    () => new Map(navItems.map((item, index) => [item.href, index + 1])),
    [navItems]
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        navItems,
        ADVISOR_NAV_FOLDER_ORDER,
        (item) => ADVISOR_ITEM_FOLDER[item.labelKey] ?? "home",
        (a, b) => (priorityByHref.get(a.href) ?? 9999) - (priorityByHref.get(b.href) ?? 9999)
      ),
    [navItems, priorityByHref]
  );

  const folderIds = useMemo(() => folderGroups.map((g) => g.folderId), [folderGroups]);

  const activeFolderFromPath = useMemo(() => {
    for (const group of folderGroups) {
      if (folderHasActiveChild(group.items, (item) => navItemIsActive(pathname, item.href))) {
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

  return (
    <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <nav
        aria-label={t("ariaDashboard")}
        className="mx-auto max-w-md overflow-x-auto overscroll-x-contain rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-chrome)] px-2 py-2.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150"
      >
        <div className="flex min-w-full flex-col gap-1.5">
          {folderIds.length > 1 ? (
            <NavFolderDockTabs folders={folderIds} activeFolderId={dockFolder} onSelect={setDockFolder} />
          ) : null}
          <div className="flex flex-row items-stretch gap-0.5 overflow-x-auto px-0.5 pb-0.5">
          {dockItems.map((item) => (
            <AdvisorDockLink
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              isActive={navItemIsActive(pathname, item.href)}
              priority={priorityByHref.get(item.href) ?? 0}
            />
          ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
