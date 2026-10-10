// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Keep Hawkins board markers fully inside the board at every size.
 *
 * Positions are emitted as CSS `clamp()` so they hold from the first server
 * render and through every resize / orientation change without JS. Markers are
 * centered on their point (`-translate-x/y-1/2`), so the clamp range is the
 * board box inset by each marker's half-extent plus a small edge pad.
 *
 * Stacked markers (several on one grid point) are spread horizontally; the
 * stack center is clamped first so the whole spread fits, then each marker is
 * clamped again so it can never leave the board even if the spread is wider
 * than the board.
 */

export const FWC_BOARD_EDGE_PAD_PX = 4;

/** Highlighted markers scale to 110% and carry a 2px ring outside their box. */
const HIGHLIGHT_SCALE = 1.1;
const RING_PX = 2;

export type FwcMarkerExtent = { halfWidth: number; halfHeight: number };

/** Conservative pre-measurement extent: 32px badge + ring + "off"/"held" tag. */
export const FWC_DEFAULT_MARKER_EXTENT: FwcMarkerExtent = { halfWidth: 22, halfHeight: 28 };

/** Half-extent of a marker from its measured (untransformed) box size. */
export function fwcMarkerExtentFromSize(width: number, height: number): FwcMarkerExtent {
  return {
    halfWidth: Math.ceil((width * HIGHLIGHT_SCALE) / 2 + RING_PX),
    halfHeight: Math.ceil((height * HIGHLIGHT_SCALE) / 2 + RING_PX),
  };
}

export type FwcMarkerPlacement = {
  /** Board-relative center before clamping, % of board width / height. */
  leftPct: number;
  topPct: number;
  /** This marker's horizontal offset from the stack center, px. */
  offsetPx: number;
  /** Largest |offset| in this marker's stack, px. */
  spreadPx: number;
  extent: FwcMarkerExtent;
};

function px(n: number): string {
  return `${Math.round(n * 100) / 100}px`;
}

export function fwcMarkerPositionStyle(p: FwcMarkerPlacement): { left: string; top: string } {
  const insetX = p.extent.halfWidth + FWC_BOARD_EDGE_PAD_PX;
  const insetY = p.extent.halfHeight + FWC_BOARD_EDGE_PAD_PX;
  const stackInset = insetX + p.spreadPx;
  const stackCenter = `clamp(${px(stackInset)}, ${p.leftPct}%, calc(100% - ${px(stackInset)}))`;
  return {
    left: `clamp(${px(insetX)}, calc(${stackCenter} + ${px(p.offsetPx)}), calc(100% - ${px(insetX)}))`,
    top: `clamp(${px(insetY)}, ${p.topPct}%, calc(100% - ${px(insetY)}))`,
  };
}

/** CSS `clamp(min, v, max)` = `max(min, min(v, max))`. */
function cssClamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Numeric twin of {@link fwcMarkerPositionStyle} for a board of the given size. */
export function fwcResolveMarkerCenterPx(
  p: FwcMarkerPlacement,
  boardWidth: number,
  boardHeight: number
): { x: number; y: number } {
  const insetX = p.extent.halfWidth + FWC_BOARD_EDGE_PAD_PX;
  const insetY = p.extent.halfHeight + FWC_BOARD_EDGE_PAD_PX;
  const stackInset = insetX + p.spreadPx;
  const stackCenter = cssClamp(stackInset, (p.leftPct / 100) * boardWidth, boardWidth - stackInset);
  return {
    x: cssClamp(insetX, stackCenter + p.offsetPx, boardWidth - insetX),
    y: cssClamp(insetY, (p.topPct / 100) * boardHeight, boardHeight - insetY),
  };
}
