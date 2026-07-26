// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { HelpCircle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export function HelpButton({
  title,
  children,
  className,
  guideHref,
  guideLabel,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Deep link into Guides curriculum / conference docs. */
  guideHref?: string;
  guideLabel?: string;
}) {
  const t = useTranslations("guides");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogId = useId();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        title={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        className={[
          "inline-flex items-center justify-center rounded-lg border border-[var(--hairline)] bg-white/60 p-1",
          "text-brand-muted hover:bg-white dark:border-white/10 dark:bg-black/30 dark:text-zinc-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent-bright/25",
          className ?? "",
        ].join(" ")}
      >
        <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
        <span className="sr-only">Help</span>
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onMouseDown={() => setOpen(false)} />
              <div
                id={dialogId}
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/90 p-4 shadow-lg backdrop-blur dark:bg-black/70 dark:text-zinc-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold">{title}</h3>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-[var(--hairline)] bg-white/60 p-1 text-brand-navy hover:bg-white dark:border-white/10 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-black/50"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
                <div className="mt-2 text-sm leading-relaxed text-brand-navy dark:text-zinc-200">
                  {children}
                </div>
                {guideHref ? (
                  <div className="mt-4 border-t border-[var(--hairline)] pt-3 dark:border-white/10">
                    <Link
                      href={guideHref}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {guideLabel ?? t("openFullGuide")}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
