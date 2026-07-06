// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Accessibility, Glasses, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  persistAndApplyColorblindMode,
  persistAndApplyColorblindType,
  persistAndApplyDyslexicFont,
  readColorblindModeFromStorage,
  readColorblindTypeFromStorage,
  readDyslexicFontFromStorage,
} from "@/lib/theme-document";
import { COLORBLIND_TYPES, type ColorblindType } from "@/lib/theme-storage";
import { useTranslations } from "next-intl";

export function AccessibilitySelector({ className }: { className?: string }) {
  const tTheme = useTranslations("themeSelector");
  const tColorblind = useTranslations("colorblindMode");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [colorblindMode, setColorblindMode] = useState(() => readColorblindModeFromStorage());
  const [colorblindType, setColorblindType] = useState<ColorblindType>(() =>
    readColorblindTypeFromStorage()
  );
  const [dyslexicFont, setDyslexicFont] = useState(() => readDyslexicFontFromStorage());
  const [popoverBox, setPopoverBox] = useState<{ top: number; right: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverBox(null);
      return;
    }
    function sync() {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPopoverBox({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  const toggleColorblindMode = useCallback(() => {
    setColorblindMode((prev) => {
      const next = !prev;
      persistAndApplyColorblindMode(next, colorblindType);
      return next;
    });
  }, [colorblindType]);

  const selectColorblindType = useCallback((type: ColorblindType) => {
    setColorblindType(type);
    persistAndApplyColorblindType(type);
  }, []);

  const toggleDyslexicFont = useCallback(() => {
    setDyslexicFont((prev) => {
      const next = !prev;
      persistAndApplyDyslexicFont(next);
      return next;
    });
  }, []);

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] opacity-0",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-brand-navy transition-apple",
          "border-[var(--hairline)] bg-[var(--material-thin)] hover:bg-[color:var(--discord-hover-bg)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={tTheme("accessibility")}
        title={tTheme("accessibility")}
      >
        <Accessibility className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {open && popoverBox && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={tTheme("accessibility")}
              style={{
                position: "fixed",
                top: popoverBox.top,
                right: popoverBox.right,
                zIndex: 300,
              }}
              className="mun-popover w-[min(100vw-1.5rem,18.5rem)] p-3"
            >
              <p className="tag tag-neutral mb-1.5">{tTheme("accessibility")}</p>
              <button
                type="button"
                title={tTheme("colorblindTitle")}
                onClick={toggleColorblindMode}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
                  colorblindMode
                    ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
                    : "border-[var(--hairline)] text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
                )}
                aria-pressed={colorblindMode}
                aria-label={colorblindMode ? tColorblind("disableAria") : tColorblind("enableAria")}
              >
                <span className="inline-flex items-center gap-2">
                  <Glasses className="size-4" strokeWidth={1.75} aria-hidden />
                  {tTheme("colorblindMode")}
                </span>
                <span className="text-xs font-semibold">{colorblindMode ? tTheme("on") : tTheme("off")}</span>
              </button>
              {colorblindMode ? (
                <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--hairline)] p-2">
                  <p className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
                    {tTheme("colorblindType")}
                  </p>
                  <div className="grid gap-1">
                    {COLORBLIND_TYPES.map((type) => {
                      const active = colorblindType === type;
                      const label =
                        type === "deuteranopia"
                          ? tTheme("colorblindDeuteranopia")
                          : type === "protanopia"
                            ? tTheme("colorblindProtanopia")
                            : tTheme("colorblindTritanopia");
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => selectColorblindType(type)}
                          aria-pressed={active}
                          className={cn(
                            "flex items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium transition-apple",
                            active
                              ? "bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] text-brand-navy"
                              : "text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
                          )}
                        >
                          <span>{label}</span>
                          {active ? (
                            <span aria-hidden className="text-brand-accent dark:text-brand-accent-bright">
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <p className="mt-2 text-[0.7rem] leading-snug text-brand-muted">{tTheme("colorblindHint")}</p>
              <button
                type="button"
                title={tTheme("dyslexicTitle")}
                onClick={toggleDyslexicFont}
                className={cn(
                  "mt-3 flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
                  dyslexicFont
                    ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
                    : "border-[var(--hairline)] text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
                )}
                aria-pressed={dyslexicFont}
                aria-label={`${tTheme("dyslexicFriendlyFont")}: ${dyslexicFont ? tTheme("on") : tTheme("off")}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Type className="size-4" strokeWidth={1.75} aria-hidden />
                  {tTheme("dyslexicFriendlyFont")}
                </span>
                <span className="text-xs font-semibold">{dyslexicFont ? tTheme("on") : tTheme("off")}</span>
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
