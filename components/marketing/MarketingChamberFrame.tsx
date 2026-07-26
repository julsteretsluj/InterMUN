// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Minimal light product chrome for marketing previews. */
export function MarketingChamberFrame({
  children,
  className,
  label = "Preview",
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
      <div className="mun-chamber-frame-bar">
        <span className="text-[0.75rem] font-medium tracking-[-0.01em] text-brand-muted">{label}</span>
      </div>
      <div className="mun-chamber-frame-body">{children}</div>
    </div>
  );
}
