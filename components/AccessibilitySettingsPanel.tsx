// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useState } from "react";
import { Glasses, Type } from "lucide-react";
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

/** Inline accessibility controls (no trigger button). */
export function AccessibilitySettingsPanel({ className }: { className?: string }) {
  const tTheme = useTranslations("themeSelector");
  const tColorblind = useTranslations("colorblindMode");
  const [colorblindMode, setColorblindMode] = useState(() => readColorblindModeFromStorage());
  const [colorblindType, setColorblindType] = useState<ColorblindType>(() =>
    readColorblindTypeFromStorage()
  );
  const [dyslexicFont, setDyslexicFont] = useState(() => readDyslexicFontFromStorage());

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

  return (
    <div className={cn("space-y-3", className)}>
      <p className="tag tag-neutral mb-0">{tTheme("accessibility")}</p>
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
        <div className="rounded-[var(--radius-md)] border border-[var(--hairline)] p-2">
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
      <p className="text-[0.7rem] leading-snug text-brand-muted">{tTheme("colorblindHint")}</p>
      <button
        type="button"
        title={tTheme("dyslexicTitle")}
        onClick={toggleDyslexicFont}
        className={cn(
          "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
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
    </div>
  );
}
