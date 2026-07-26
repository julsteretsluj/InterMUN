// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Session-floor monitor chrome for marketing previews — always light Apple glass. */
export function MarketingChamberFrame({
  children,
  className,
  label = "LIVE FLOOR",
  variant: _variant = "light",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  /** @deprecated Always renders light; kept for call-site compatibility. */
  variant?: "dark" | "light";
}) {
  return (
    <div className={cn("mun-chamber-frame mun-chamber-frame-light overflow-hidden", className)}>
      <div className="mun-chamber-frame-bar text-brand-muted">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="mun-chamber-dot bg-rose-400/80" />
          <span className="mun-chamber-dot bg-amber-400/80" />
          <span className="mun-chamber-dot bg-emerald-500/80" />
        </div>
        <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand-navy">
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--accent)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden />
          Live
        </span>
      </div>
      <div className="mun-chamber-frame-body bg-[var(--apple-bg-secondary,#f5f5f7)]">{children}</div>
    </div>
  );
}
