// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import {
  FwcHawkinsBoard,
  type FwcBoardCharacter,
} from "@/components/fwc/FwcHawkinsBoard";
import { FwcMovementForm } from "@/components/fwc/FwcMovementForm";
import { FWC_MARKER_LEGEND } from "@/lib/fwc/board-markers";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import type { FwcBoardEvidenceMarker } from "@/lib/fwc/evidence-location";

export function FwcMapClient({
  characters,
  evidenceMarkers = [],
  highlightAllocationId = null,
  showMovementForm = false,
  movementForm = null,
}: {
  characters: FwcBoardCharacter[];
  /** Chair-only: evidence catalog pins on the board. */
  evidenceMarkers?: FwcBoardEvidenceMarker[];
  highlightAllocationId?: string | null;
  showMovementForm?: boolean;
  movementForm?: {
    conferenceId: string;
    currentGrid: string;
    baseMp: number;
    bonusMp: number;
    hasQueuedMovement: boolean;
  } | null;
}) {
  const [targetHint, setTargetHint] = useState<string | null>(null);

  const legend = useMemo(() => {
    const present = new Set(characters.map((c) => c.country));
    return FWC_MARKER_LEGEND.filter((row) => present.has(row.country)).map((row) => {
      const catalog = lookupFwcCharacter(row.country);
      return {
        ...row,
        displayName: catalog?.displayName ?? row.country,
      };
    });
  }, [characters]);

  return (
    <div className="space-y-5">
      <FwcHawkinsBoard
        characters={characters}
        evidenceMarkers={evidenceMarkers}
        highlightAllocationId={highlightAllocationId}
        onSelectCell={showMovementForm && movementForm ? setTargetHint : undefined}
      />

      {legend.length > 0 ? (
        <section
          aria-label="Character marker legend"
          className="rounded-[16px] border border-[#D1D1D6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-5"
        >
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            Who is who
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {legend.map((row) => (
              <li
                key={row.country}
                className="inline-flex items-center gap-2 rounded-[980px] border border-[#D1D1D6] bg-[#F2F2F7] py-1 pl-1 pr-3"
              >
                {row.iconSrc ? (
                  <span className="relative h-6 w-6 overflow-hidden rounded-full" aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element -- small static public badge */}
                    <img src={row.iconSrc} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span
                    className="flex h-6 min-w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  >
                    {row.shortLabel}
                  </span>
                )}
                <span className="text-xs font-medium text-[#1D1D1F]">{row.displayName}</span>
              </li>
            ))}
          </ul>
          {evidenceMarkers.length > 0 ? (
            <p className="mt-3 text-xs text-[#6E6E73]">
              Squared badges are evidence pins (chair view only). Tap one for title and grid.
            </p>
          ) : null}
        </section>
      ) : null}

      {showMovementForm && movementForm ? (
        <FwcMovementForm
          conferenceId={movementForm.conferenceId}
          currentGrid={movementForm.currentGrid}
          baseMp={movementForm.baseMp}
          bonusMp={movementForm.bonusMp}
          hasQueuedMovement={movementForm.hasQueuedMovement}
          targetGridHint={targetHint}
        />
      ) : null}
    </div>
  );
}
