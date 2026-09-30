// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  NAV_FOLDER_META,
  NAV_SUBFOLDER_META,
  folderHasActiveChild,
  type NavFolderGroup,
  type NavFolderId,
  type NavSubfolderGroup,
  type NavSubfolderId,
} from "@/lib/nav-folder-groups";
import { cn } from "@/lib/utils";
import { useOptionalTour } from "@/components/tour/tour-context";

/** Accordion state: one folder open at a time; expand/collapse only via click. */
export function useNavFolderExpansion<T>(
  folderGroups: readonly NavFolderGroup<T>[],
  isItemActive: (item: T) => boolean
) {
  const activeFolderId = useMemo(() => {
    for (const group of folderGroups) {
      if (folderHasActiveChild(group.items, isItemActive)) {
        return group.folderId;
      }
    }
    return folderGroups[0]?.folderId ?? null;
  }, [folderGroups, isItemActive]);

  const [pinState, setPinState] = useState<{
    expandedFolderId: NavFolderId | null;
    activeAtPin: NavFolderId | null;
  } | null>(null);

  const expandedFolderId =
    pinState && pinState.activeAtPin === activeFolderId
      ? pinState.expandedFolderId
      : activeFolderId;

  const onFolderToggle = useCallback(
    (folderId: NavFolderId) => {
      setPinState((prev) => {
        const currentExpanded =
          prev && prev.activeAtPin === activeFolderId
            ? prev.expandedFolderId
            : activeFolderId;
        const nextExpanded = currentExpanded === folderId ? null : folderId;
        return { expandedFolderId: nextExpanded, activeAtPin: activeFolderId };
      });
    },
    [activeFolderId]
  );

  return {
    expandedFolderId,
    onFolderToggle,
  };
}

/**
 * Nested subfolder expand/collapse within an open top-level folder.
 * Multiple subfolders may be open; active-child subfolders auto-expand,
 * and the first subfolder opens when none are active.
 */
export function useNavSubfolderExpansion<T>(
  subfolders: readonly NavSubfolderGroup<T>[],
  isItemActive: (item: T) => boolean
) {
  const activeSubfolderIds = useMemo(() => {
    const ids = new Set<NavSubfolderId>();
    for (const group of subfolders) {
      if (folderHasActiveChild(group.items, isItemActive)) {
        ids.add(group.subfolderId);
      }
    }
    return ids;
  }, [subfolders, isItemActive]);

  const activeKey = useMemo(
    () => [...activeSubfolderIds].sort().join("|"),
    [activeSubfolderIds]
  );

  const [pinState, setPinState] = useState<{
    open: Record<NavSubfolderId, boolean>;
    activeAtPin: string;
  } | null>(null);

  const defaultOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    if (activeSubfolderIds.size > 0) {
      for (const id of activeSubfolderIds) open[id] = true;
    } else if (subfolders[0]) {
      open[subfolders[0].subfolderId] = true;
    }
    return open as Record<NavSubfolderId, boolean>;
  }, [activeSubfolderIds, subfolders]);

  const openMap =
    pinState && pinState.activeAtPin === activeKey ? pinState.open : defaultOpen;

  const isSubfolderExpanded = useCallback(
    (subfolderId: NavSubfolderId) => Boolean(openMap[subfolderId]),
    [openMap]
  );

  const onSubfolderToggle = useCallback(
    (subfolderId: NavSubfolderId) => {
      setPinState((prev) => {
        const base =
          prev && prev.activeAtPin === activeKey ? { ...prev.open } : { ...defaultOpen };
        base[subfolderId] = !base[subfolderId];
        return { open: base, activeAtPin: activeKey };
      });
    },
    [activeKey, defaultOpen]
  );

  return { isSubfolderExpanded, onSubfolderToggle };
}

export function NavFolder({
  folderId,
  expanded = false,
  hasActiveChild = false,
  labelsHidden = false,
  compact = false,
  onToggle,
  children,
}: {
  folderId: NavFolderId;
  expanded?: boolean;
  hasActiveChild?: boolean;
  /** Chair sidebar icon-only mode */
  labelsHidden?: boolean;
  /** Aspire sidebar: labels show on parent `group-hover` */
  compact?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("navFolders");
  const meta = NAV_FOLDER_META[folderId];
  const panelId = useId();
  const label = t(meta.labelKey);
  const tour = useOptionalTour();
  const isExpanded = Boolean(tour?.running) || expanded;

  return (
    <div className="nav-folder">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        title={label}
        className={cn(
          "nav-folder-trigger flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-md)] py-2 text-left text-sm font-semibold text-brand-muted transition-apple hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,#ffffff)]",
          labelsHidden ? "justify-center px-2" : "px-2.5",
          compact &&
            "justify-center px-2 group-hover:justify-start group-hover:gap-2 group-hover:px-2.5",
          hasActiveChild && "text-brand-navy"
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            isExpanded && "rotate-90",
            labelsHidden && "hidden",
            compact && "hidden group-hover:block"
          )}
          aria-hidden
        />
        <span className="text-base leading-none" aria-hidden>
          {meta.emoji}
        </span>
        {!labelsHidden ? (
          <span className={cn("min-w-0 flex-1 truncate", compact && "hidden group-hover:inline")}>
            {label}
          </span>
        ) : (
          <span className="sr-only">{label}</span>
        )}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn(
          "nav-folder-panel grid transition-[grid-template-rows] duration-200 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "nav-folder-children flex flex-col gap-0.5 pb-1 pt-0.5",
              /* Nest past the folder chevron so subtabs read as children */
              labelsHidden
                ? "pl-0"
                : compact
                  ? "pl-0 group-hover:pl-5"
                  : "pl-5"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Nested accordion under a top-level `NavFolder` — lighter chrome, same expand pattern. */
export function NavSubfolder({
  subfolderId,
  expanded = false,
  hasActiveChild = false,
  labelsHidden = false,
  compact = false,
  onToggle,
  children,
}: {
  subfolderId: NavSubfolderId;
  expanded?: boolean;
  hasActiveChild?: boolean;
  labelsHidden?: boolean;
  compact?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("navFolders.subfolders");
  const meta = NAV_SUBFOLDER_META[subfolderId];
  const panelId = useId();
  const label = t(meta.labelKey);
  const tour = useOptionalTour();
  const isExpanded = Boolean(tour?.running) || expanded;

  return (
    <div className="nav-subfolder">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        title={label}
        className={cn(
          "nav-subfolder-trigger flex w-full min-w-0 items-center gap-1.5 rounded-[var(--radius-md)] py-1.5 text-left text-[0.7rem] font-semibold tracking-[-0.01em] text-brand-muted transition-apple hover:bg-[color:color-mix(in_srgb,var(--color-text)_4%,#ffffff)]",
          labelsHidden ? "justify-center px-1.5" : "px-2",
          compact &&
            "justify-center px-1.5 group-hover:justify-start group-hover:gap-1.5 group-hover:px-2",
          hasActiveChild && "text-brand-navy"
        )}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200",
            isExpanded && "rotate-90",
            labelsHidden && "hidden",
            compact && "hidden group-hover:block"
          )}
          aria-hidden
        />
        {!labelsHidden ? (
          <span className={cn("min-w-0 flex-1 truncate", compact && "hidden group-hover:inline")}>
            {label}
          </span>
        ) : (
          <span className="sr-only">{label}</span>
        )}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn(
          "nav-subfolder-panel grid transition-[grid-template-rows] duration-200 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "nav-subfolder-children flex flex-col gap-0.5 pb-0.5 pt-0.5",
              labelsHidden
                ? "pl-0"
                : compact
                  ? "pl-0 group-hover:pl-3"
                  : "pl-3"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders loose items + nested subfolders inside a top-level folder. */
export function NavFolderSections<T>({
  group,
  isItemActive,
  labelsHidden = false,
  compact = false,
  renderItem,
}: {
  group: NavFolderGroup<T>;
  isItemActive: (item: T) => boolean;
  labelsHidden?: boolean;
  compact?: boolean;
  renderItem: (item: T) => ReactNode;
}) {
  const { isSubfolderExpanded, onSubfolderToggle } = useNavSubfolderExpansion(
    group.subfolders,
    isItemActive
  );

  if (group.subfolders.length === 0) {
    return <>{group.looseItems.map(renderItem)}</>;
  }

  return (
    <>
      {group.looseItems.map(renderItem)}
      {group.subfolders.map((sub) => (
        <NavSubfolder
          key={sub.subfolderId}
          subfolderId={sub.subfolderId}
          labelsHidden={labelsHidden}
          compact={compact}
          expanded={isSubfolderExpanded(sub.subfolderId)}
          hasActiveChild={folderHasActiveChild(sub.items, isItemActive)}
          onToggle={() => onSubfolderToggle(sub.subfolderId)}
        >
          {sub.items.map(renderItem)}
        </NavSubfolder>
      ))}
    </>
  );
}

/** Horizontal folder pills for mobile docks. */
export function NavFolderDockTabs({
  folders,
  activeFolderId,
  onSelect,
}: {
  folders: NavFolderId[];
  activeFolderId: NavFolderId;
  onSelect: (id: NavFolderId) => void;
}) {
  const t = useTranslations("navFolders");

  return (
    <div
      className="inline-flex w-full shrink-0 gap-0.5 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] p-0.5"
      role="tablist"
      aria-label={t("dockFoldersAria")}
    >
      {folders.map((folderId) => {
        const meta = NAV_FOLDER_META[folderId];
        const selected = activeFolderId === folderId;
        return (
          <button
            key={folderId}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(folderId)}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[calc(var(--radius-md)-2px)] px-2 py-1.5 text-[0.7rem] font-medium transition-apple sm:flex-initial",
              selected
                ? "bg-[var(--material-thick)] font-semibold text-brand-navy shadow-sm"
                : "text-brand-muted"
            )}
          >
            <span className="text-xs leading-none" aria-hidden>
              {meta.emoji}
            </span>
            <span className="truncate">{t(meta.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
