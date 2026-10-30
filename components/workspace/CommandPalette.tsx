// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  COMMAND_GROUP_LABELS,
  COMMAND_GROUP_ORDER,
  commandsForRole,
} from "@/lib/workspace/command-items";
import type { WorkspaceCommandItem, WorkspaceRole } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}

export function useCommandPaletteOptional() {
  return useContext(CommandPaletteContext);
}

function matchesQuery(item: WorkspaceCommandItem, query: string): boolean {
  if (!query) return true;
  const haystack = [item.label, item.href, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function CommandPaletteDialog({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: WorkspaceRole | null;
}) {
  const router = useRouter();
  const t = useTranslations("commandPalette");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "fa" || locale === "he";
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const filtered = commandsForRole(role).filter((item) => matchesQuery(item, query));
    return COMMAND_GROUP_ORDER.flatMap((group) => filtered.filter((item) => item.group === group));
  }, [role, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runCommand = useCallback(
    (item: WorkspaceCommandItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router]
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (event.key === "Enter" && items[activeIndex]) {
        event.preventDefault();
        runCommand(items[activeIndex]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, onClose, runCommand]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[color:color-mix(in_srgb,#1d1d1f_42%,transparent)] px-4 pt-[min(18vh,8rem)] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        dir={isRtl ? "rtl" : "ltr"}
        className="mun-apple-material mun-apple-material-regular w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[color:color-mix(in_srgb,var(--dashboard-card)_88%,transparent)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-md"
      >
        <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-3">
          <Search className="size-4 shrink-0 text-brand-muted" strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-brand-navy outline-none placeholder:text-brand-muted"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
          />
          <kbd className="hidden rounded-md border border-[var(--hairline)] bg-[var(--material-thin)] px-1.5 py-0.5 text-[0.65rem] font-medium text-brand-muted sm:inline">
            esc
          </kbd>
        </div>
        <div
          id="command-palette-results"
          role="listbox"
          className="max-h-[min(24rem,50vh)] overflow-y-auto p-2"
        >
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-brand-muted">{t("empty")}</p>
          ) : (
            COMMAND_GROUP_ORDER.map((group) => {
              const groupItems = items.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group} className="mb-2">
                  <p className="px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-brand-muted">
                    {COMMAND_GROUP_LABELS[group]}
                  </p>
                  <ul className="space-y-0.5">
                    {groupItems.map((item) => {
                      runningIndex += 1;
                      const index = runningIndex;
                      const active = index === activeIndex;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              active
                                ? "bg-[color:color-mix(in_srgb,var(--accent)_14%,transparent)] text-brand-navy"
                                : "text-brand-navy hover:bg-[color:var(--discord-hover-bg)]"
                            )}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => runCommand(item)}
                          >
                            <span className="inline-flex size-7 shrink-0 items-center justify-center text-base" aria-hidden>
                              {item.emoji ?? "•"}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                            <span className="hidden truncate text-xs text-brand-muted sm:inline">
                              {item.href}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] px-4 py-2 text-[0.7rem] text-brand-muted">
          <span>{t("hintNavigate")}</span>
          <span className="hidden sm:inline">{t("hintOpen")}</span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteProvider({
  children,
  role,
}: {
  children: ReactNode;
  role: WorkspaceRole | null;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteDialog open={open} onClose={() => setOpen(false)} role={role} />
    </CommandPaletteContext.Provider>
  );
}

/** Top-bar search affordance that opens the command palette. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const ctx = useCommandPaletteOptional();
  const t = useTranslations("commandPalette");
  const tSearch = useTranslations("dashboardSearch");

  return (
    <button
      type="button"
      onClick={() => ctx?.setOpen(true)}
      disabled={!ctx}
      className={cn(
        "relative flex w-full max-w-xl items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-2.5 text-left text-sm text-brand-muted transition-apple",
        "hover:border-[color:color-mix(in_srgb,var(--accent)_45%,var(--hairline))] hover:bg-[color:color-mix(in_srgb,var(--accent)_8%,transparent)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_25%,transparent)]",
        !ctx && "opacity-70",
        className
      )}
      aria-label={tSearch("aria")}
    >
      <Search className="size-[1.05rem] shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{tSearch("placeholder")}</span>
      <kbd className="hidden shrink-0 rounded-md border border-[var(--hairline)] bg-[var(--dashboard-card)] px-1.5 py-0.5 text-[0.65rem] font-medium text-brand-muted sm:inline">
        {t("shortcut")}
      </kbd>
    </button>
  );
}
