// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { INTERMUN_EMBLEM_LIGHT_PATH, INTERMUN_EMBLEM_PATH } from "@/lib/branding";
import { cn } from "@/lib/utils";

/** Light wordmark is wide — only height (or explicit max-w) should constrain it. */
function lightWordmarkClasses(className?: string): string {
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

/** Dark circular emblem stays square; derive from max height when only wordmark sizing is passed. */
function darkEmblemClasses(className?: string): string {
  const tokens = (className ?? "").split(/\s+/).filter(Boolean);
  const darkTokens = tokens.filter((token) => token.includes("dark:"));
  if (darkTokens.length) {
    return darkTokens.map((token) => token.replace(/dark:/g, "")).join(" ");
  }

  const lightTokens = tokens.filter((token) => !token.startsWith("dark:"));
  const maxH = lightTokens.find((token) => /^max-h-/.test(token));
  if (maxH) {
    const size = maxH.replace("max-h-", "");
    return `h-${size} w-${size}`;
  }

  const h = lightTokens.find((token) => /^h-/.test(token) && !/^max-h-/.test(token));
  if (h) return `${h} ${h.replace(/^h-/, "w-")}`;

  return "h-10 w-10";
}

/**
 * InterMUN emblem. Light mode uses the rainbow chain wordmark
 * (`public/intermun-emblem-light.png`); dark mode uses the full circular
 * mark with laurel wreath (`public/intermun-emblem.png`).
 */
export function InterMunEmblem({
  className,
  alt = "InterMUN",
}: {
  className?: string;
  /** Use `alt=""` when a visible “InterMUN” label sits next to the image. */
  alt?: string;
}) {
  return (
    <>
      <span className="inline-flex max-w-full shrink-0 items-center justify-center overflow-visible leading-none dark:hidden">
        <img
          src={INTERMUN_EMBLEM_LIGHT_PATH}
          alt={alt}
          className={cn(lightWordmarkClasses(className), "aspect-square")}
          decoding="async"
        />
      </span>
      <img
        src={INTERMUN_EMBLEM_PATH}
        alt={alt}
        className={cn(
          "hidden shrink-0 object-contain drop-shadow-[0_4px_22px_rgba(0,0,0,0.45)] dark:block",
          darkEmblemClasses(className)
        )}
        decoding="async"
      />
    </>
  );
}
