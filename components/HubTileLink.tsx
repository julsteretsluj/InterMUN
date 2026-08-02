// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { cn } from "@/lib/utils";

type HubTileLinkProps = {
  href: string;
  label: string;
  hint: string;
  priority: number;
  /** Overview quick tiles use secondary fill; Jump tab uses elevated card. */
  variant?: "overview" | "jump";
};

export function HubTileLink({
  href,
  label,
  hint,
  priority,
  variant = "jump",
}: HubTileLinkProps) {
  const stagger = ((priority - 1) % 3) + 1;
  const tall = priority % 3 === 0;

  return (
    <Link
      href={href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "hub-tile-link mun-lift mun-animate-rise group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--accent)_12%,var(--hairline))] px-5 py-5 pl-12 transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-apple-out)] hover:-translate-y-1 hover:shadow-[var(--dashboard-shadow-hover)]",
        tall ? "min-h-[7.5rem] md:pb-7" : "min-h-[6.25rem]",
        variant === "overview"
          ? "bg-[var(--apple-bg-tertiary)]"
          : "bg-[var(--dashboard-card)] shadow-[var(--dashboard-shadow)]",
        stagger === 1 && "mun-animate-delay-1",
        stagger === 2 && "mun-animate-delay-2",
        stagger === 3 && "mun-animate-delay-3"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-[var(--accent)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-apple-out)] group-hover:scale-y-100"
      />
      <NavPriorityBadge priority={priority} variant="tile" />
      <span className="flex items-center justify-between gap-2">
        <span className="font-heading text-[0.98rem] font-normal tracking-normal text-brand-navy dark:text-zinc-100">
          {label}
        </span>
        <span
          aria-hidden
          className="translate-x-0 text-brand-muted opacity-0 transition-all duration-[var(--dur-base)] ease-[var(--ease-apple)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)] group-hover:opacity-100 dark:text-zinc-500 dark:group-hover:text-[var(--accent-bright)]"
        >
          →
        </span>
      </span>
      <span className="mt-1.5 text-xs leading-relaxed text-brand-muted dark:text-zinc-400">{hint}</span>
    </Link>
  );
}
