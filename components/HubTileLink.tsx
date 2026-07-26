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
  return (
    <Link
      href={href}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "hub-tile-link mun-lift group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--hairline)] px-5 py-5 pl-12",
        variant === "overview"
          ? "bg-[var(--apple-bg-tertiary)]"
          : "bg-[var(--dashboard-card)] shadow-[var(--dashboard-shadow)]"
      )}
    >
      {/* Accent edge reveal on hover */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-[var(--accent)] transition-transform duration-[var(--dur-base)] ease-[var(--ease-apple-out)] group-hover:scale-y-100"
      />
      <NavPriorityBadge priority={priority} variant="tile" />
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold text-brand-navy dark:text-zinc-100">{label}</span>
        <span
          aria-hidden
          className="translate-x-0 text-brand-muted opacity-0 transition-all duration-[var(--dur-base)] ease-[var(--ease-apple)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)] group-hover:opacity-100 dark:text-zinc-500 dark:group-hover:text-[var(--accent-bright)]"
        >
          →
        </span>
      </span>
      <span className="mt-1 text-xs leading-relaxed text-brand-muted dark:text-zinc-400">{hint}</span>
    </Link>
  );
}
