// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { cn } from "@/lib/utils";

/** Ambient frosted glass circles — CSS only so we never spawn extra WebGL scenes. */
export function MarketingGlassOrb({
  placement,
  size = "md",
  delay,
}: {
  placement: string;
  size?: "sm" | "md" | "lg" | "xl";
  delay?: 1 | 2 | 3;
}) {
  const sizeClass = {
    sm: "mun-marketing-glass-orb--sm",
    md: "mun-marketing-glass-orb--md",
    lg: "mun-marketing-glass-orb--lg",
    xl: "mun-marketing-glass-orb--xl",
  }[size];

  return (
    <div
      className={cn(
        "mun-marketing-glass-orb",
        sizeClass,
        placement,
        delay === 1 && "mun-animate-delay-1",
        delay === 2 && "mun-animate-delay-2",
        delay === 3 && "mun-animate-delay-3"
      )}
      aria-hidden
    >
      <div className="mun-marketing-glass-orb-shell mun-apple-material mun-apple-material-ultrathin">
        <span className="mun-marketing-glass-orb-fallback" />
        <span className="mun-marketing-glass-orb-shine" />
      </div>
    </div>
  );
}
