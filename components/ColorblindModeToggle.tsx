"use client";

import { useCallback, useEffect, useState } from "react";
import { Glasses } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  persistAndApplyColorblindMode,
  readColorblindModeFromStorage,
} from "@/lib/theme-document";
import { useTranslations } from "next-intl";

export function ColorblindModeToggle({ className }: { className?: string }) {
  const t = useTranslations("colorblindMode");
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setEnabled(readColorblindModeFromStorage());
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      persistAndApplyColorblindMode(next);
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
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? t("disableAria") : t("enableAria")}
      title={enabled ? t("disableTitle") : t("enableTitle")}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-brand-navy transition-apple",
        "border-[var(--hairline)] bg-[var(--material-thin)] hover:bg-[color:var(--discord-hover-bg)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        enabled &&
          "border-[color:color-mix(in_srgb,var(--accent)_45%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_14%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--accent)_25%,transparent)]",
        className
      )}
    >
      <Glasses className="size-4" strokeWidth={2} aria-hidden />
      <span className="sr-only">{enabled ? t("on") : t("off")}</span>
    </button>
  );
}
