// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { getAppName, getAppTagline, INTERMUN_WORDMARK_DARK_PATH, INTERMUN_WORDMARK_LIGHT_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function BrandWordmark({
  className = "",
  size = "default",
  surface = "theme",
}: {
  className?: string;
  /** Larger lockup (e.g. login / signup); title and tagline stay default scale. */
  size?: "default" | "hero";
  /** Auth/gate forms stay light even when the site theme is dark. */
  surface?: "theme" | "light";
}) {
  const title = getAppName();
  const sub = getAppTagline();
  const hero = size === "hero";
  const alt = sub ? `${title} — ${sub}` : title;
  const wordmarkClass = hero
    ? "block h-auto w-auto max-h-14 max-w-[min(92vw,28rem)] shrink-0 object-contain object-center md:max-h-16 lg:max-h-20"
    : "block h-auto w-auto max-h-10 max-w-[min(88vw,24rem)] shrink-0 object-contain object-center md:max-h-12";

  return (
    <div className={cn("text-center", className)}>
      <div className="flex justify-center">
        <span className={cn("inline-flex max-w-full", surface !== "light" && "dark:hidden")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand wordmark sized via CSS classes */}
          <img src={INTERMUN_WORDMARK_LIGHT_PATH} alt={alt} className={wordmarkClass} decoding="async" />
        </span>
        {surface !== "light" ? (
          <span className="hidden max-w-full dark:inline-flex">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand wordmark sized via CSS classes */}
            <img src={INTERMUN_WORDMARK_DARK_PATH} alt={alt} className={wordmarkClass} decoding="async" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
