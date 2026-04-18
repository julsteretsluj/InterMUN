"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_HUES,
  type ThemeHue,
  type ThemePreference,
} from "@/lib/theme-storage";
import {
  persistAndApplyDyslexicFont,
  persistAndApplyTheme,
  readDyslexicFontFromStorage,
  readThemeFromStorage,
} from "@/lib/theme-document";

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
    swatch: "bg-gradient-to-br from-white to-zinc-800 ring-1 ring-zinc-400",
    swatchDark: "bg-gradient-to-br from-zinc-200 to-zinc-800 ring-1 ring-zinc-500",
  },
};

export function ThemeSelector({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemePreference>(() => readThemeFromStorage().mode);
  const [hue, setHue] = useState<ThemeHue>(() => readThemeFromStorage().hue);
  const [dyslexicFont, setDyslexicFont] = useState(() => readDyslexicFontFromStorage());
  const [mounted, setMounted] = useState(false);
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

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white opacity-0 dark:border-white/15 dark:bg-black/20",
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
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
          "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          "dark:border-white/15 dark:bg-black/25 dark:text-brand-navy dark:hover:bg-white/10",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-bright"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Theme: color & appearance"
        aria-label="Open theme settings"
      >
        <Palette className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Theme settings"
          className="absolute right-0 z-[100] mt-2 w-[min(100vw-1.5rem,18rem)] rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Appearance
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAppearance("light")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                mode === "light"
                  ? "border-brand-accent/38 bg-brand-accent/10 text-brand-navy dark:border-brand-accent dark:bg-brand-accent/16 dark:text-brand-accent-bright"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              <Sun className="size-4" strokeWidth={1.75} aria-hidden />
              Light
            </button>
            <button
              type="button"
              onClick={() => setAppearance("dark")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                mode === "dark"
                  ? "border-brand-accent/38 bg-brand-accent/10 text-brand-navy dark:border-brand-accent dark:bg-brand-accent/16 dark:text-brand-accent-bright"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              <Moon className="size-4" strokeWidth={1.75} aria-hidden />
              Dark
            </button>
          </div>

          <div
            className="mt-4 grid grid-cols-4 gap-2"
            role="radiogroup"
            aria-label="Accent colour"
          >
            {THEME_HUES.map((h) => {
              const meta = HUE_META[h];
              const active = hue === h;
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={meta.name}
                  title={meta.name}
                  onClick={() => setColorHue(h)}
                  className={cn(
                    "flex items-center justify-center rounded-lg border p-2 transition",
                    active
                      ? "border-brand-accent bg-brand-accent/12 dark:border-brand-accent/45 dark:bg-brand-accent/14"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-full shadow-inner",
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

          <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Typography
          </p>
          <button
            type="button"
            onClick={toggleDyslexicFont}
            className={cn(
              "mt-2 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition",
              dyslexicFont
                ? "border-brand-accent/38 bg-brand-accent/10 text-brand-navy dark:border-brand-accent dark:bg-brand-accent/16 dark:text-brand-accent-bright"
                : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            )}
            aria-pressed={dyslexicFont}
          >
            <span className="inline-flex items-center gap-2">
              <Type className="size-4" strokeWidth={1.75} aria-hidden />
              Dyslexic-friendly font
            </span>
            <span className="text-xs font-semibold">{dyslexicFont ? "On" : "Off"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
