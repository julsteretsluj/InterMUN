// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { INTERMUN_EMBLEM_LIGHT_PATH, INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/** Gavel-ring mark is wide — only height (or explicit max-w) should constrain it. */
function emblemClasses(className?: string): string {
  const tokens = (className ?? "")
    .split(/\s+/)
    .filter((token) => token && !token.startsWith("dark:"));

  const maxHTokens = tokens.filter((token) => /\bmax-h-/.test(token));
  const hTokens = tokens.filter((token) => /\bh-/.test(token) && !/\bmax-h-/.test(token));
  const maxWTokens = tokens.filter((token) => /\bmax-w-/.test(token));
  const hasAutoWidth = tokens.includes("w-auto");

  const heightClass =
    maxHTokens.join(" ") ||
    (hTokens.length
      ? hTokens
          .map((token) => token.replace(/^h-/, "max-h-").replace(/^sm:max-h-/, "sm:max-h-"))
          .join(" ")
      : "max-h-10");

  return cn(
    "block h-auto w-auto shrink-0 object-contain object-center",
    heightClass,
    hasAutoWidth || maxWTokens.length ? maxWTokens : null,
    !hasAutoWidth && !maxWTokens.length ? "max-w-full" : null,
    hasAutoWidth ? "w-auto" : null
  );
}

/**
 * InterMUN emblem. Light mode uses the navy gavel-and-ring mark
 * (`public/intermun-emblem-light.png`); dark mode uses the white gavel-and-ring
 * mark (`public/intermun-emblem.png`).
 */
export function InterMunEmblem({
  className,
  alt = "InterMUN",
  surface = "theme",
}: {
  className?: string;
  /** Use `alt=""` when a visible “InterMUN” label sits next to the image. */
  alt?: string;
  /** Auth/gate forms stay light even when the site theme is dark. Brand panels use dark. */
  surface?: "theme" | "light" | "dark";
}) {
  const sized = emblemClasses(className);
  const forceLight = surface === "light";
  const forceDark = surface === "dark";
  return (
    <>
      {!forceDark ? (
        <span
          className={cn(
            "inline-flex max-w-full shrink-0 items-center justify-center overflow-visible leading-none",
            !forceLight && "dark:hidden"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small static emblem sized purely via CSS classes */}
          <img src={INTERMUN_EMBLEM_LIGHT_PATH} alt={alt} className={sized} decoding="async" />
        </span>
      ) : null}
      {!forceLight ? (
        <span
          className={cn(
            "max-w-full shrink-0 items-center justify-center overflow-visible leading-none",
            forceDark ? "inline-flex" : "hidden dark:inline-flex"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small static emblem sized purely via CSS classes */}
          <img src={INTERMUN_EMBLEM_PATH} alt={alt} className={sized} decoding="async" />
        </span>
      ) : null}
    </>
  );
}
