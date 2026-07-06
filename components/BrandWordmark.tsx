// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { getAppName, getAppTagline } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { cn } from "@/lib/utils";

export function BrandWordmark({
  className = "",
  size = "default",
}: {
  className?: string;
  /** Larger emblem only (e.g. login / signup); title and tagline stay default scale. */
  size?: "default" | "hero";
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
          className={cn(
            hero
              ? "max-h-28 w-auto max-w-[min(92vw,22rem)] md:max-h-36 lg:max-h-40 dark:h-28 dark:w-28 md:dark:h-36 md:dark:w-36 lg:dark:h-40 lg:dark:w-40"
              : "max-h-20 w-auto max-w-[min(88vw,18rem)] md:max-h-24 dark:h-20 dark:w-20 md:dark:h-24"
          )}
        />
      </div>
    </div>
  );
}
