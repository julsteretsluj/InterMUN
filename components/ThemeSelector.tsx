// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel";
import { useTranslations } from "next-intl";

export function ThemeSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("themeSelector");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverBox, setPopoverBox] = useState<{ top: number; right: number; maxHeight: number } | null>(
    null
  );
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
    if (!open) return;
    function sync() {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.bottom + 8;
      setPopoverBox({
        top,
        right: Math.max(12, window.innerWidth - rect.right),
        maxHeight: Math.max(160, window.innerHeight - top - 12),
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

  const iconButtonClass = cn(
    "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-brand-navy transition-apple",
    compact ? "size-8" : "size-9"
  );

  if (!mounted) {
    return (
      <span
        className={cn(
          iconButtonClass,
          "border-[var(--hairline)] bg-[var(--material-thin)] opacity-0",
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
          iconButtonClass,
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
                maxHeight: popoverBox.maxHeight,
              }}
              className="mun-popover flex w-[min(100vw-1.5rem,22rem)] flex-col p-3"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <ThemeSettingsPanel />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
