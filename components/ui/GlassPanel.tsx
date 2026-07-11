// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { cn } from "@/lib/utils";

export type AppleMaterialThickness = "ultrathin" | "thin" | "regular" | "thick";

type GlassPanelProps = {
  children: React.ReactNode;
  className?: string;
  /** Apple UI material thickness (default regular). */
  material?: AppleMaterialThickness;
  /** Subtle hover lift + border brighten (default true). */
  interactive?: boolean;
  /** Dense padding for nested panels (default false → p-6 md:p-8). */
  dense?: boolean;
  as?: "div" | "section" | "article";
};

const MATERIAL_CLASS: Record<AppleMaterialThickness, string> = {
  ultrathin: "mun-apple-material-ultrathin",
  thin: "mun-apple-material-thin",
  regular: "mun-apple-material-regular",
  thick: "mun-apple-material-thick",
};

export function GlassPanel({
  children,
  className,
  material = "regular",
  interactive = true,
  dense = false,
  as: Tag = "div",
}: GlassPanelProps) {
  return (
    <Tag
      className={cn(
        "mun-apple-material",
        "mun-glass-panel",
        MATERIAL_CLASS[material],
        interactive && "mun-glass-panel-interactive mun-apple-material-interactive",
        dense ? "mun-glass-panel-dense" : "mun-glass-panel-spacious",
        className
      )}
    >
      {children}
    </Tag>
  );
}
