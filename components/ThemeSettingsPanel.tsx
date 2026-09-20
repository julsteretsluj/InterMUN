// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useState } from "react";
import { ALargeSmall, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { nearestThemeHue, themeHueToHex } from "@/lib/apple-color-picker";
import { AppleColorPicker } from "@/components/ui/AppleColorPicker";
import {
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_MIN,
  textSizeStepToRootPct,
  THEME_HUES,
  type TextSizeStep,
  type ThemePreference,
} from "@/lib/theme-storage";
import {
  clampTextSizeStep,
  persistAndApplyTextSize,
  persistAndApplyTheme,
  readTextSizeFromStorage,
  readThemeFromStorage,
} from "@/lib/theme-document";
import { useTranslations } from "next-intl";

const THEME_HUE_PRESETS = THEME_HUES.map((hue) => themeHueToHex(hue));

/** Inline theme / text-size controls (no trigger button). */
export function ThemeSettingsPanel({ className }: { className?: string }) {
  const t = useTranslations("themeSelector");
  const [mode, setMode] = useState<ThemePreference>(() => readThemeFromStorage().mode);
  const [accentHex, setAccentHex] = useState(() => readThemeFromStorage().accentHex);
  const [textSizeStep, setTextSizeStep] = useState<TextSizeStep>(() => readTextSizeFromStorage());

  const setAppearance = useCallback(
    (next: ThemePreference) => {
      setMode(next);
      persistAndApplyTheme(next, accentHex);
    },
    [accentHex]
  );

  const setAccentColor = useCallback(
    (nextHex: string) => {
      setAccentHex(nextHex);
      persistAndApplyTheme(mode, nextHex);
    },
    [mode]
  );

  const onTextSizeSliderChange = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const v = clampTextSizeStep(Number(e.currentTarget.value));
    setTextSizeStep(v);
    persistAndApplyTextSize(v);
  }, []);

  const accentLabelHue = nearestThemeHue(accentHex);
  const accentIsPreset =
    themeHueToHex(accentLabelHue).toLowerCase() === accentHex.toLowerCase();

  return (
    <div className={cn("space-y-3", className)}>
      <p className="tag tag-neutral mb-0.5">{t("appearance")}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAppearance("light")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
            mode === "light"
              ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
              : "border-[var(--hairline)] text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
          )}
        >
          <Sun className="size-4" strokeWidth={1.75} aria-hidden />
          {t("light")}
        </button>
        <button
          type="button"
          onClick={() => setAppearance("dark")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
            mode === "dark"
              ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
              : "border-[var(--hairline)] text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
          )}
        >
          <Moon className="size-4" strokeWidth={1.75} aria-hidden />
          {t("dark")}
        </button>
      </div>

      <p className="tag tag-accent mb-0">{t("accentColour")}</p>
      <AppleColorPicker
        embedded
        color={accentHex}
        opacity={100}
        presets={THEME_HUE_PRESETS}
        title={t("colorsTitle")}
        onColorChange={(hex) => setAccentColor(hex)}
      />
      <p className="text-center text-[0.65rem] font-medium text-brand-muted">
        {accentIsPreset
          ? t(`hues.${accentLabelHue}`)
          : t("customAccent", { hex: accentHex.toUpperCase() })}
      </p>

      <p className="tag tag-neutral mb-0">{t("typography")}</p>
      <p
        id="text-size-heading"
        className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted"
      >
        <ALargeSmall className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
        {t("textSize")}
      </p>
      <div className="space-y-2" role="group" aria-labelledby="text-size-heading">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted">
            {t("scale")}
          </span>
          <span className="tabular-nums text-sm font-semibold text-brand-navy dark:text-zinc-100">
            {textSizeStepToRootPct(textSizeStep)}%
          </span>
        </div>
        <input
          id="text-size-slider"
          type="range"
          min={TEXT_SIZE_STEP_MIN}
          max={TEXT_SIZE_STEP_MAX}
          step={1}
          value={textSizeStep}
          onInput={onTextSizeSliderChange}
          onChange={onTextSizeSliderChange}
          aria-valuemin={TEXT_SIZE_STEP_MIN}
          aria-valuemax={TEXT_SIZE_STEP_MAX}
          aria-valuenow={textSizeStep}
          aria-valuetext={`${textSizeStepToRootPct(textSizeStep)} percent base size`}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_8%,var(--color-bg-page))] accent-[color:var(--accent)]"
        />
        <div className="flex justify-between px-0.5 text-[0.65rem] font-medium text-brand-muted">
          <span>{t("small")}</span>
          <span>{t("medium")}</span>
          <span>{t("large")}</span>
        </div>
      </div>
    </div>
  );
}
