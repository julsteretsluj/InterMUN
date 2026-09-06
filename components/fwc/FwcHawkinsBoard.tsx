// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  FWC_GRID_BOUNDS,
  FWC_GRID_COLUMNS,
  FWC_GRID_ROW_MAX,
  FWC_GRID_ROW_MIN,
  FWC_HAWKINS_BOARD_SRC,
  fwcCellCenterPct,
  fwcGridToBoardPoint,
} from "@/lib/fwc/board-grid";
import {
  fwcMarkerColorForCountry,
  fwcMarkerIconSrc,
  fwcMarkerShortLabel,
} from "@/lib/fwc/board-markers";

export type FwcBoardCharacter = {
  allocationId: string;
  country: string;
  displayName: string;
  currentGrid: string;
  baseMp: number;
  bonusMp: number;
  heldEvidenceCount?: number;
};

type StackedMarker = FwcBoardCharacter & {
  leftPct: number;
  topPct: number;
  offGrid: boolean;
  gridLabel: string;
  stackIndex: number;
  stackTotal: number;
};

function stackKey(leftPct: number, topPct: number, offGrid: boolean): string {
  return `${offGrid ? "off" : "on"}:${leftPct.toFixed(2)}:${topPct.toFixed(2)}`;
}

export function FwcHawkinsBoard({
  characters,
  highlightAllocationId = null,
  onSelectCell,
  className = "",
}: {
  characters: FwcBoardCharacter[];
  highlightAllocationId?: string | null;
  /** Optional: clicking an empty cell reports e.g. "B8" for movement forms. */
  onSelectCell?: (grid: string) => void;
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const markers = useMemo(() => {
    const placed: Omit<StackedMarker, "stackIndex" | "stackTotal">[] = [];
    for (const character of characters) {
      const point = fwcGridToBoardPoint(character.currentGrid);
      if (!point) continue;
      placed.push({
        ...character,
        leftPct: point.leftPct,
        topPct: point.topPct,
        offGrid: point.offGrid,
        gridLabel: point.label,
      });
    }

    const groups = new Map<string, typeof placed>();
    for (const marker of placed) {
      const key = stackKey(marker.leftPct, marker.topPct, marker.offGrid);
      const list = groups.get(key) ?? [];
      list.push(marker);
      groups.set(key, list);
    }

    const stacked: StackedMarker[] = [];
    for (const list of groups.values()) {
      list.forEach((marker, index) => {
        stacked.push({
          ...marker,
          stackIndex: index,
          stackTotal: list.length,
        });
      });
    }
    return stacked;
  }, [characters]);

  const active = markers.find((m) => m.allocationId === activeId) ?? null;

  function handleBoardClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSelectCell) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-fwc-marker]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const { leftPct, rightPct, topPct, bottomPct } = FWC_GRID_BOUNDS;
    if (xPct < leftPct || xPct > rightPct || yPct < topPct || yPct > bottomPct) return;

    const colFrac = (xPct - leftPct) / (rightPct - leftPct);
    const rowFrac = (yPct - topPct) / (bottomPct - topPct);
    const colIndex = Math.min(
      FWC_GRID_COLUMNS.length - 1,
      Math.max(0, Math.floor(colFrac * FWC_GRID_COLUMNS.length))
    );
    const rowIndex = Math.min(
      FWC_GRID_ROW_MAX - FWC_GRID_ROW_MIN,
      Math.max(0, Math.floor(rowFrac * (FWC_GRID_ROW_MAX - FWC_GRID_ROW_MIN + 1)))
    );
    onSelectCell(`${FWC_GRID_COLUMNS[colIndex]}${rowIndex + FWC_GRID_ROW_MIN}`);
  }

  return (
    <section
      className={`overflow-hidden rounded-[16px] border border-[#D1D1D6] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${className}`}
      aria-label="Hawkins Parallel Tactical Board"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1D1D6] px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            Hawkins tactical board
          </h3>
          <p className="mt-0.5 text-xs text-[#6E6E73]">
            A–L × 1–13 · live positions from character state
            {onSelectCell ? " · tap a cell to set a target grid" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, Number((s - 0.25).toFixed(2))))}
            className="rounded-[980px] border border-[#D1D1D6] bg-[#F2F2F7] px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] hover:bg-white"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-[#6E6E73]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.25).toFixed(2))))}
            className="rounded-[980px] border border-[#D1D1D6] bg-[#F2F2F7] px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] hover:bg-white"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      <div className="overflow-auto bg-[#F2F2F7] p-3 sm:p-4">
        <div
          className="relative mx-auto origin-top-left transition-transform duration-200"
          style={{
            width: `${scale * 100}%`,
            maxWidth: scale === 1 ? "56rem" : undefined,
          }}
        >
          <div
            className={`relative aspect-square w-full overflow-hidden rounded-[12px] bg-[#1D1D1F] ${
              onSelectCell ? "cursor-crosshair" : ""
            }`}
            onClick={handleBoardClick}
          >
            <Image
              src={FWC_HAWKINS_BOARD_SRC}
              alt="Hawkins Parallel Tactical Board — Hawkins, Indiana, 1986"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 56rem"
              className="pointer-events-none object-contain"
            />

            {markers.map((marker) => {
              const color = fwcMarkerColorForCountry(marker.country);
              const short = fwcMarkerShortLabel(marker.country, marker.displayName);
              const iconSrc = fwcMarkerIconSrc(marker.country);
              const highlighted =
                marker.allocationId === highlightAllocationId ||
                marker.allocationId === activeId;
              const offset = marker.stackTotal > 1 ? (marker.stackIndex - (marker.stackTotal - 1) / 2) * 10 : 0;

              return (
                <button
                  key={marker.allocationId}
                  type="button"
                  data-fwc-marker
                  title={`${marker.displayName} · ${marker.gridLabel}`}
                  aria-label={`${marker.displayName} at ${marker.gridLabel}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveId((id) =>
                      id === marker.allocationId ? null : marker.allocationId
                    );
                  }}
                  className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 focus:outline-none"
                  style={{
                    left: `calc(${marker.leftPct}% + ${offset}px)`,
                    top: `${marker.topPct}%`,
                  }}
                >
                  {iconSrc ? (
                    <span
                      className={`relative h-8 w-8 overflow-hidden rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-2 transition ${
                        highlighted ? "ring-white scale-110" : "ring-white/80"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- small static public badge */}
                      <img
                        src={iconSrc}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </span>
                  ) : (
                    <span
                      className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tracking-tight text-white shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-2 transition ${
                        highlighted ? "ring-white scale-110" : "ring-white/80"
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {short}
                    </span>
                  )}
                  {marker.offGrid ? (
                    <span className="rounded-[6px] bg-[#1D1D1F]/90 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-white">
                      off
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {active ? (
        <div className="border-t border-[#D1D1D6] bg-white px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            {active.displayName}
          </p>
          <p className="mt-1 text-sm text-[#6E6E73]">
            Grid{" "}
            <span className="font-semibold text-[#1D1D1F]">{active.gridLabel}</span>
            {active.offGrid ? " (off-grid pin)" : ""}
            {" · "}
            MP{" "}
            <span className="font-semibold tabular-nums text-[#1D1D1F]">
              {active.baseMp}
              {active.bonusMp > 0 ? ` + ${active.bonusMp}` : ""}
            </span>
            {typeof active.heldEvidenceCount === "number" ? (
              <>
                {" · "}
                Evidence{" "}
                <span className="font-semibold tabular-nums text-[#1D1D1F]">
                  {active.heldEvidenceCount}
                </span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* Keep cell math available for tests / future debug overlays without rendering noise */}
      <span className="sr-only">
        Grid bounds {FWC_GRID_BOUNDS.leftPct}–{FWC_GRID_BOUNDS.rightPct}% ×{" "}
        {FWC_GRID_BOUNDS.topPct}–{FWC_GRID_BOUNDS.bottomPct}%; sample B8 at{" "}
        {(() => {
          const c = fwcCellCenterPct(1, 7);
          return `${c.leftPct.toFixed(1)}%, ${c.topPct.toFixed(1)}%`;
        })()}
      </span>
    </section>
  );
}
