// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { cn } from "@/lib/utils";

type GlassCanvasProps = {
  children: React.ReactNode;
  className?: string;
};

/** Pastel canvas with a restrained ambient wash behind solid cards. */
export function GlassCanvas({ children, className }: GlassCanvasProps) {
  return (
    <div className={cn("mun-glass-canvas relative isolate bg-[var(--dashboard-cream)]", className)}>
      <div className="mun-glass-ambient" aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
