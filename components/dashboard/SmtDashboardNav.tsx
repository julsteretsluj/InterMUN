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
  SMT_ITEM_FOLDER,
  SMT_NAV_FOLDER_ORDER,
  folderHasActiveChild,
  groupNavByFolder,
  type NavFolderId,
} from "@/lib/nav-folder-groups";
import {
  SMT_NAV_KEY_ORDER,
  sortByKeyPriority,
} from "@/lib/nav-priority-order";
import { cn } from "@/lib/utils";

export type SmtNavKey =
  | "liveCommittees"
  | "eventSessions"
  | "roomCodes"
  | "advisors"
  | "notes"
  | "awards"
  | "allocationMatrix"
  | "allocationPasswords"
  | "newsroom"
  | "pressCorps"
  | "milestones"
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
  { href: "/smt/advisors", navKey: "advisors", emoji: "🎓" },
  { href: "/smt/newsroom", navKey: "newsroom", emoji: "📰" },
  { href: "/smt/press-corps", navKey: "pressCorps", emoji: "📸" },
  { href: "/smt/milestones", navKey: "milestones", emoji: "🏅" },
  { href: "/smt/notes", navKey: "notes", emoji: "💬" },
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
  priority,
}: {
  item: SmtNavItem;
  label: string;
  isActive: boolean;
  priority: number;
}) {
  return (
    <Link
      href={item.href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "nav-priority-link nav-priority-link--rail discord-interactive-hover flex w-full min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-apple group-hover:justify-start group-hover:gap-3 group-hover:px-2.5 group-hover:pl-8",
        isActive
          ? "smt-nav-row-active font-semibold"
          : "font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]"
      )}
    >
      <NavPriorityBadge priority={priority} />
      <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
        {item.emoji}
      </span>
      <span className="hidden truncate group-hover:inline">{label}</span>
    </Link>
  );
}

function SmtDockLink({
  item,
  label,
  isActive,
  priority,
}: {
  item: SmtNavItem;
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

const SMT_NAV_ITEMS_ORDERED = sortByKeyPriority(SMT_NAV_ITEMS, "navKey", SMT_NAV_KEY_ORDER);

export function SmtDashboardSidebar({ hubLabel }: { hubLabel: string }) {
  const tNav = useTranslations("smtNav");
  const tDash = useTranslations("dashboardLayout");
  const pathname = usePathname();
  const hubActive = pathname === "/smt" || pathname.startsWith("/smt/committees/");

  const priorityByKey = useMemo(
    () => new Map(SMT_NAV_ITEMS_ORDERED.map((item, index) => [item.navKey, index + 1])),
    []
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        SMT_NAV_ITEMS_ORDERED,
        SMT_NAV_FOLDER_ORDER,
        (item) => SMT_ITEM_FOLDER[item.navKey] ?? "operations",
        (a, b) => (priorityByKey.get(a.navKey) ?? 9999) - (priorityByKey.get(b.navKey) ?? 9999)
      ),
    [priorityByKey]
  );

  const { expandedFolderId, onFolderToggle } = useNavFolderExpansion(
    folderGroups,
    (item) => smtNavItemIsActive(pathname, item)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-2 pb-2 pt-3 group-hover:px-3">
        <Link
          href="/smt"
          title={hubLabel}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--accent)] px-2 py-2 text-center text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset] transition-apple hover:opacity-95 group-hover:gap-2 group-hover:px-3 group-hover:py-2.5",
            hubActive &&
              "ring-2 ring-[color:color-mix(in_srgb,white_45%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)]"
          )}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
            📌
          </span>
          <span className="hidden min-w-0 truncate group-hover:inline">{hubLabel}</span>
          <span className="text-xs font-bold leading-none tracking-wide group-hover:hidden" aria-hidden>
            {tNav("hubAbbrev")}
          </span>
        </Link>
      </div>

      <nav
        aria-label={tNav("ariaDashboard")}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-1 [scrollbar-width:thin] group-hover:px-3"
      >
        {folderGroups.map(({ folderId, items }) => (
          <NavFolder
            key={folderId}
            folderId={folderId}
            compact
            expanded={expandedFolderId === folderId}
            hasActiveChild={folderHasActiveChild(items, (item) => smtNavItemIsActive(pathname, item))}
            onToggle={() => onFolderToggle(folderId)}
          >
            {items.map((item) => (
              <SmtSidebarLink
                key={item.href}
                item={item}
                label={tNav(item.navKey)}
                isActive={smtNavItemIsActive(pathname, item)}
                priority={priorityByKey.get(item.navKey) ?? 0}
              />
            ))}
          </NavFolder>
        ))}
      </nav>

      <div className="mt-auto shrink-0 space-y-1 border-t border-[var(--hairline)] px-2 py-3 group-hover:px-3">
        <Link
          href="/guides"
          className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>
            ❓
          </span>
          <span className="hidden group-hover:inline">{tDash("helpCenter")}</span>
        </Link>
      </div>
    </div>
  );
}

export function SmtMobileDock() {
  const tNav = useTranslations("smtNav");
  const pathname = usePathname();

  const priorityByKey = useMemo(
    () => new Map(SMT_NAV_ITEMS_ORDERED.map((item, index) => [item.navKey, index + 1])),
    []
  );

  const folderGroups = useMemo(
    () =>
      groupNavByFolder(
        SMT_NAV_ITEMS_ORDERED,
        SMT_NAV_FOLDER_ORDER,
        (item) => SMT_ITEM_FOLDER[item.navKey] ?? "operations",
        (a, b) => (priorityByKey.get(a.navKey) ?? 9999) - (priorityByKey.get(b.navKey) ?? 9999)
      ),
    [priorityByKey]
  );

  const folderIds = useMemo(() => folderGroups.map((g) => g.folderId), [folderGroups]);

  const activeFolderFromPath = useMemo(() => {
    for (const group of folderGroups) {
      if (folderHasActiveChild(group.items, (item) => smtNavItemIsActive(pathname, item))) {
        return group.folderId;
      }
    }
    return folderIds[0] ?? "operations";
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
      <div className="mx-auto max-w-2xl overflow-x-auto overscroll-x-contain rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-chrome)] px-2 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)]">
        <div className="flex min-w-full flex-col gap-1.5">
          {folderIds.length > 1 ? (
            <NavFolderDockTabs folders={folderIds} activeFolderId={dockFolder} onSelect={setDockFolder} />
          ) : null}
          <div className="flex items-center gap-0.5 overflow-x-auto">
          {dockItems.map((item) => (
            <SmtDockLink
              key={item.href}
              item={item}
              label={tNav(item.navKey)}
              isActive={smtNavItemIsActive(pathname, item)}
              priority={priorityByKey.get(item.navKey) ?? 0}
            />
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
