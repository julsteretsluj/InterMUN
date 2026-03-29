"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme-storage";
import { cn } from "@/lib/utils";

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return v === "dark" ? "dark" : "light";
}

function applyDom(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPref(readPreference());
  }, []);

  const toggle = useCallback(() => {
    const next: ThemePreference = pref === "light" ? "dark" : "light";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyDom(next);
    setPref(next);
  }, [pref]);

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

  const isDark = pref === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        "dark:border-white/15 dark:bg-black/25 dark:text-brand-navy dark:hover:bg-white/10",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-bright",
        className
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="size-4" strokeWidth={2} /> : <Moon className="size-4" strokeWidth={2} />}
    </button>
  );
}
