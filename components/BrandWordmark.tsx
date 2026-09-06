// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { InterMunEmblem } from "@/components/InterMunEmblem";
import { getAppName, getAppTagline } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function BrandWordmark({
  className = "",
  size = "default",
  surface = "theme",
  variant = "lockup",
  align = "center",
}: {
  className?: string;
  /** Larger lockup (e.g. login / signup); title and tagline stay default scale. */
  size?: "default" | "hero";
  /** Auth/gate forms stay light even when the site theme is dark. Brand panels use dark. */
  surface?: "theme" | "light" | "dark";
  /** Full gavel + intermun.site, text only, or emblem only. */
  variant?: "lockup" | "wordmark" | "emblem";
  align?: "center" | "start";
}) {
  const title = getAppName();
  const sub = getAppTagline();
  const hero = size === "hero";
  const alt = sub ? `${title} — ${sub}` : title;
  const showEmblem = variant !== "wordmark";
  const showText = variant !== "emblem";
  const emblemSurface = surface === "dark" ? "dark" : surface;
  const emblemClass = hero
    ? variant === "emblem"
      ? "max-h-16 md:max-h-20"
      : "max-h-12 md:max-h-14"
    : variant === "emblem"
      ? "max-h-12 md:max-h-14"
      : "max-h-10 md:max-h-11";
  const textClass = hero
    ? "text-[clamp(2.15rem,4vw,3.15rem)]"
    : "text-[clamp(1.55rem,3vw,2.05rem)]";

  return (
    <span className={cn("block", align === "start" ? "text-left" : "text-center", className)}>
      <span
        className={cn(
          "inline-flex max-w-full items-center",
          showEmblem && showText ? "gap-3" : null,
          align === "start" ? "justify-start" : "justify-center"
        )}
      >
        {showEmblem ? (
          <InterMunEmblem
            alt={showText ? "" : alt}
            className={emblemClass}
            surface={emblemSurface}
          />
        ) : null}
        {showText ? (
          <span
            className={cn(
              "mun-brand-wordmark inline-flex items-baseline whitespace-nowrap leading-none",
              surface === "light" && "mun-brand-wordmark-light",
              surface === "dark" && "mun-brand-wordmark-dark",
              textClass
            )}
          >
            <span className="mun-brand-word">intermun</span>
            <span className="mun-brand-word-suffix">.site</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}
