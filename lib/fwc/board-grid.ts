// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Hawkins Parallel Tactical Board — grid overlay calibration.
 *
 * Image: /fwc/hawkins-tactical-board.jpg (1024×1024).
 * Playable cells A1–L13 sit inside the illustrated map (below the title bar,
 * above the legend strip). Bounds are percentages of the full image so markers
 * track `object-contain` scaling.
 *
 * Calibrated against landmarks: rift F|G ≈ 50% of grid width, Creel Hive (H8),
 * Lover’s Lake (C12–D13), playable green starting ~y 12.5%.
 */

export const FWC_HAWKINS_BOARD_SRC = "/fwc/hawkins-tactical-board.jpg";

export const FWC_GRID_COLUMNS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

export type FwcGridColumn = (typeof FWC_GRID_COLUMNS)[number];

/** Inclusive row range on the printed board. */
export const FWC_GRID_ROW_MIN = 1;
export const FWC_GRID_ROW_MAX = 13;

/** Percentage box of the playable A1–L13 rectangle within the board image. */
export const FWC_GRID_BOUNDS = {
  leftPct: 4,
  rightPct: 96,
  topPct: 12.5,
  bottomPct: 73.2,
} as const;

export type FwcParsedGridCell = {
  kind: "cell";
  raw: string;
  column: FwcGridColumn;
  colIndex: number;
  row: number;
  rowIndex: number;
};

export type FwcParsedSpecialGrid = {
  kind: "special";
  raw: string;
  token: "OUTER_WOODS" | "MOBILE" | "CHECKPOINT" | "OTHER";
};

export type FwcParsedGrid = FwcParsedGridCell | FwcParsedSpecialGrid;

export type FwcBoardPoint = {
  /** 0–100, percentage of board image width (marker center). */
  leftPct: number;
  /** 0–100, percentage of board image height (marker center). */
  topPct: number;
  /** True when the pin is off the A–L / 1–13 lattice. */
  offGrid: boolean;
  label: string;
};

const SPECIAL_TOKENS = new Set(["OUTER_WOODS", "MOBILE", "CHECKPOINT"]);

/**
 * Parse a live `current_grid` / catalog `baseGrid` into a cell or special pin.
 * Accepts "B8", "b8", "J10", and SCREAMING specials.
 */
export function parseFwcGrid(raw: string | null | undefined): FwcParsedGrid | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase().replace(/\s+/g, "_");
  if (SPECIAL_TOKENS.has(upper)) {
    return {
      kind: "special",
      raw: trimmed,
      token: upper as "OUTER_WOODS" | "MOBILE" | "CHECKPOINT",
    };
  }

  const match = /^([A-L])\s*([1-9]|1[0-3])$/i.exec(trimmed);
  if (!match) {
    return { kind: "special", raw: trimmed, token: "OTHER" };
  }

  const column = match[1]!.toUpperCase() as FwcGridColumn;
  const row = Number(match[2]);
  return {
    kind: "cell",
    raw: `${column}${row}`,
    column,
    colIndex: FWC_GRID_COLUMNS.indexOf(column),
    row,
    rowIndex: row - FWC_GRID_ROW_MIN,
  };
}

/** Center of a standard cell as % of the board image. */
export function fwcCellCenterPct(colIndex: number, rowIndex: number): { leftPct: number; topPct: number } {
  const { leftPct, rightPct, topPct, bottomPct } = FWC_GRID_BOUNDS;
  const width = rightPct - leftPct;
  const height = bottomPct - topPct;
  return {
    leftPct: leftPct + ((colIndex + 0.5) / FWC_GRID_COLUMNS.length) * width,
    topPct: topPct + ((rowIndex + 0.5) / (FWC_GRID_ROW_MAX - FWC_GRID_ROW_MIN + 1)) * height,
  };
}

/**
 * Map a grid string to a marker position on the tactical board image.
 * Specials land on documented off-grid / nearest-landmark pins.
 */
export function fwcGridToBoardPoint(raw: string | null | undefined): FwcBoardPoint | null {
  const parsed = parseFwcGrid(raw);
  if (!parsed) return null;

  if (parsed.kind === "cell") {
    const center = fwcCellCenterPct(parsed.colIndex, parsed.rowIndex);
    return {
      ...center,
      offGrid: false,
      label: parsed.raw,
    };
  }

  switch (parsed.token) {
    case "OUTER_WOODS":
      // Dense forest west of column A (Hawkins woods / cabin).
      return { leftPct: 1.8, topPct: 42, offGrid: true, label: "OUTER_WOODS" };
    case "MOBILE":
      // Road network near column E — “in transit” pin with off-grid badge.
      return { leftPct: 38, topPct: 28, offGrid: true, label: "MOBILE" };
    case "CHECKPOINT":
      // Lab perimeter / northern approach (near A3–B3 compound edge).
      return { leftPct: 6.5, topPct: 22, offGrid: true, label: "CHECKPOINT" };
    default: {
      // Unknown token: park in the Field Notes legend strip so it stays visible.
      return { leftPct: 52, topPct: 88, offGrid: true, label: parsed.raw };
    }
  }
}

export function isParseableFwcGridCell(raw: string | null | undefined): boolean {
  const parsed = parseFwcGrid(raw);
  return parsed?.kind === "cell";
}
