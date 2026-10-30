// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { MunPageShell } from "@/components/MunPageShell";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { WorkspaceRole } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

export type WorkspaceHomeTile = {
  href: string;
  title: string;
  description: string;
  emoji: string;
  featured?: boolean;
};

const ROLE_TITLES: Record<WorkspaceRole, string> = {
  delegate: "Delegate workspace",
  chair: "Chair workspace",
  advisor: "Advisor portal",
  smt: "Secretariat hub",
  admin: "Admin console",
};

const ROLE_SUBTITLES: Record<WorkspaceRole, string> = {
  delegate: "Session floor, research suite, resolutions, voting, and messaging.",
  chair: "Prep, floor control, Digital Room, documents, scoring, and crisis tools.",
  advisor: "Monitor linked delegates, notes, schedules, and conference feeds.",
  smt: "Live committees, allocations, access codes, and event configuration.",
  admin: "Conference setup, intake boards, roles, and global content.",
};

export function RoleWorkspaceHome({
  role,
  tiles,
  conferenceLine,
}: {
  role: WorkspaceRole;
  tiles: WorkspaceHomeTile[];
  conferenceLine?: string | null;
}) {
  return (
    <MunPageShell title={ROLE_TITLES[role]} variant="split">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--clicky-ink-muted)]">
        {ROLE_SUBTITLES[role]}
        {conferenceLine ? (
          <>
            {" "}
            <span className="text-[var(--clicky-ink)]">· {conferenceLine}</span>
          </>
        ) : null}
      </p>
      <p className="text-xs text-brand-muted">
        Press <kbd className="rounded border border-[var(--hairline)] px-1.5 py-0.5 font-medium">⌘K</kbd>{" "}
        / <kbd className="rounded border border-[var(--hairline)] px-1.5 py-0.5 font-medium">Ctrl+K</kbd> for
        the command palette.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="group block">
            <GlassPanel
              dense
              className={cn(
                "h-full transition-[border-color,background-color] duration-200",
                tile.featured && "border-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--material-thin)] text-xl" aria-hidden>
                  {tile.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-tight text-[var(--clicky-ink)] group-hover:text-[var(--accent)]">
                    {tile.title}
                  </h3>
                  <p className="mt-1 text-sm leading-snug text-brand-muted">{tile.description}</p>
                </div>
              </div>
            </GlassPanel>
          </Link>
        ))}
      </div>
    </MunPageShell>
  );
}
