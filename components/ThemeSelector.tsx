"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ALargeSmall, Check, Moon, Palette, Sun, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TEXT_SIZE_STEP_MAX,
  TEXT_SIZE_STEP_MIN,
  TEXT_SIZE_STEP_ROOT_PCT,
  THEME_HUES,
  type TextSizeStep,
  type ThemeHue,
  type ThemePreference,
} from "@/lib/theme-storage";
import {
  clampTextSizeStep,
  persistAndApplyDyslexicFont,
  persistAndApplyTextSize,
  persistAndApplyTheme,
  readDyslexicFontFromStorage,
  readTextSizeFromStorage,
  readThemeFromStorage,
} from "@/lib/theme-document";
import { useTranslations } from "next-intl";

/** Display + accessibility names; picker shows swatches only. */
const HUE_META: Record<
  ThemeHue,
  { name: string; swatch: string; swatchDark?: string }
> = {
  blue: { name: "Blue", swatch: "bg-brand-accent" },
  red: { name: "Red", swatch: "bg-red-600" },
  orange: { name: "Orange", swatch: "bg-orange-500" },
  yellow: { name: "Yellow", swatch: "bg-yellow-500" },
  purple: { name: "Purple", swatch: "bg-violet-600" },
  pink: { name: "Pink", swatch: "bg-pink-600" },
  neutral: {
    name: "Neutral",
    swatch: "bg-zinc-500 ring-1 ring-zinc-400",
    swatchDark: "bg-zinc-600 ring-1 ring-zinc-500",
  },
};

export function ThemeSelector({ className }: { className?: string }) {
  const t = useTranslations("themeSelector");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemePreference>(() => readThemeFromStorage().mode);
  const [hue, setHue] = useState<ThemeHue>(() => readThemeFromStorage().hue);
  const [dyslexicFont, setDyslexicFont] = useState(() => readDyslexicFontFromStorage());
  const [textSizeStep, setTextSizeStep] = useState<TextSizeStep>(() => readTextSizeFromStorage());
  const [mounted, setMounted] = useState(false);
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
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
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

  const setAppearance = useCallback(
    (next: ThemePreference) => {
      setMode(next);
      persistAndApplyTheme(next, hue);
    },
    [hue]
  );

  const setColorHue = useCallback(
    (next: ThemeHue) => {
      setHue(next);
      persistAndApplyTheme(mode, next);
    },
    [mode]
  );

  const toggleDyslexicFont = useCallback(() => {
    setDyslexicFont((prev) => {
      const next = !prev;
      persistAndApplyDyslexicFont(next);
      return next;
    });
  }, []);

  const onTextSizeSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = clampTextSizeStep(Number(e.target.value));
    setTextSizeStep(v);
    persistAndApplyTextSize(v);
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
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-brand-navy transition-apple",
          "border-[var(--hairline)] bg-[var(--material-thin)] hover:bg-[color:var(--discord-hover-bg)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t("buttonTitle")}
        aria-label={t("openSettingsAria")}
      >
        <Palette className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {open && popoverBox && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={t("dialogAria")}
              style={{
                position: "fixed",
                top: popoverBox.top,
                right: popoverBox.right,
                zIndex: 300,
              }}
              className="mun-popover w-[min(100vw-1.5rem,18.5rem)] p-3"
            >
          <p className="tag tag-neutral mb-0.5">{t("appearance")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
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

          <p className="tag tag-accent mt-4 mb-1.5">{t("accentColour")}</p>
          <div
            className="grid grid-cols-4 gap-2"
            role="radiogroup"
            aria-label={t("accentColour")}
          >
            {THEME_HUES.map((h) => {
              const meta = HUE_META[h];
              const hueLabel = t(`hues.${h}`);
              const active = hue === h;
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={hueLabel}
                  title={hueLabel}
                  onClick={() => setColorHue(h)}
                  className={cn(
                    "flex items-center justify-center rounded-[var(--radius-md)] p-1.5 transition-apple",
                    active
                      ? "ring-2 ring-[color:color-mix(in_srgb,var(--accent)_55%,transparent)]"
                      : "ring-0 ring-transparent"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-full ring-2 ring-white/90 shadow-sm dark:ring-white/25",
                      h === "neutral"
                        ? mode === "dark"
                          ? meta.swatchDark
                          : meta.swatch
                        : meta.swatch
                    )}
                  >
                    {active ? (
                      <Check
                        className={cn(
                          "absolute size-4 drop-shadow-sm",
                          h === "yellow" && "text-zinc-900",
                          h === "neutral" && "text-zinc-900 dark:text-white",
                          h !== "yellow" && h !== "neutral" && "text-white"
                        )}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="tag tag-neutral mt-4 mb-1.5">{t("typography")}</p>
          <p id="text-size-heading" className="mb-2 mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-muted">
            <ALargeSmall className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {t("textSize")}
          </p>
          <div className="space-y-2" role="group" aria-labelledby="text-size-heading">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted">{t("scale")}</span>
              <span className="tabular-nums text-sm font-semibold text-brand-navy dark:text-zinc-100">
                {TEXT_SIZE_STEP_ROOT_PCT[textSizeStep]}%
              </span>
            </div>
            <input
              id="text-size-slider"
              type="range"
              min={TEXT_SIZE_STEP_MIN}
              max={TEXT_SIZE_STEP_MAX}
              step={1}
              value={textSizeStep}
              onChange={onTextSizeSliderChange}
              aria-valuemin={TEXT_SIZE_STEP_MIN}
              aria-valuemax={TEXT_SIZE_STEP_MAX}
              aria-valuenow={textSizeStep}
              aria-valuetext={`${TEXT_SIZE_STEP_ROOT_PCT[textSizeStep]} percent base size`}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_8%,var(--color-bg-page))] accent-[color:var(--accent)]"
            />
            <div className="flex justify-between px-0.5 text-[0.65rem] font-medium text-brand-muted">
              <span>{t("small")}</span>
              <span>{t("medium")}</span>
              <span>{t("large")}</span>
            </div>
          </div>
          <button
            type="button"
            title={t("dyslexicTitle")}
            onClick={toggleDyslexicFont}
            className={cn(
              "mt-3 flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-apple",
              dyslexicFont
                ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
                : "border-[var(--hairline)] text-brand-muted hover:bg-[color:var(--discord-hover-bg)]"
            )}
            aria-pressed={dyslexicFont}
          >
            <span className="inline-flex items-center gap-2">
              <Type className="size-4" strokeWidth={1.75} aria-hidden />
              {t("dyslexicFriendlyFont")}
            </span>
            <span className="text-xs font-semibold">{dyslexicFont ? t("on") : t("off")}</span>
          </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
