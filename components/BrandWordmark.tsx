// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { getAppName, getAppTagline } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { cn } from "@/lib/utils";

export function BrandWordmark({
  className = "",
  size = "default",
  surface = "theme",
}: {
  className?: string;
  /** Larger emblem only (e.g. login / signup); title and tagline stay default scale. */
  size?: "default" | "hero";
  /** Auth/gate forms stay light even when the site theme is dark. */
  surface?: "theme" | "light";
}) {
  const title = getAppName();
  const sub = getAppTagline();
  const hero = size === "hero";
  const alt = sub ? `${title} — ${sub}` : title;
  return (
    <div className={cn("text-center", className)}>
      <div className="flex justify-center">
        <InterMunEmblem
          alt={alt}
          surface={surface}
          className={cn(
            hero
              ? "max-h-28 w-auto max-w-[min(92vw,22rem)] md:max-h-36 lg:max-h-40"
              : "max-h-20 w-auto max-w-[min(88vw,18rem)] md:max-h-24"
          )}
        />
      </div>
    </div>
  );
}
