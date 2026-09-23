// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Clicky macOS-window chrome for marketing product previews. */
export function MarketingChamberFrame({
  children,
  className,
  label = "preview.app",
  variant: _variant = "light",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  /** @deprecated Always renders light clicky chrome. */
  variant?: "dark" | "light";
}) {
  return (
    <div className={cn("clicky-window clicky-window-lg overflow-hidden", className)}>
      <div className="clicky-window-bar">
        <span className="clicky-traffic" aria-hidden />
        <span className="clicky-window-title">{label.toLowerCase()}</span>
      </div>
      <div className="clicky-preview-body bg-[var(--clicky-window)] p-3 md:p-4">{children}</div>
    </div>
  );
}
