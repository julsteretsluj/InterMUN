"use client";

import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  NAV_FOLDER_META,
  folderHasActiveChild,
  type NavFolderGroup,
  type NavFolderId,
} from "@/lib/nav-folder-groups";
import { cn } from "@/lib/utils";

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

  return (
    <div className="nav-folder">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        title={label}
        className={cn(
          "nav-folder-trigger flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-md)] py-1.5 text-left text-sm font-semibold text-brand-muted transition-apple hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,#ffffff)]",
          labelsHidden ? "justify-center px-2" : "px-2.5",
          compact && "justify-center gap-0 px-2 group-hover:justify-start group-hover:gap-2 group-hover:px-2.5",
          hasActiveChild && "text-brand-navy"
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            expanded && "rotate-90",
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
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "flex flex-col gap-0.5 pb-1 pt-0.5",
              !labelsHidden && "pl-1",
              compact && "group-hover:pl-1"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
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
