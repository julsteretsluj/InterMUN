"use client";

import { useEffect, useId, useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function HelpButton({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();

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
          "inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white/60 p-1",
          "text-slate-600 hover:bg-white dark:border-white/10 dark:bg-black/30 dark:text-zinc-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent-bright/25",
          className ?? "",
        ].join(" ")}
      >
        <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
        <span className="sr-only">Help</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/90 p-4 shadow-lg backdrop-blur dark:bg-black/70 dark:text-zinc-100"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200/90 bg-white/60 p-1 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-black/30 dark:text-zinc-200 dark:hover:bg-black/50"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-zinc-200">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

