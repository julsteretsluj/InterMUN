// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { FwcEvidenceHolder, FwcEvidenceMonitorRow } from "@/lib/fwc/evidence-types";

/** Pull a board cell like H3 from "H3 (Gate Alpha)" or bare "B8". */
export function extractFwcGridFromLocation(location: string | null | undefined): string | null {
  const trimmed = (location ?? "").trim();
  if (!trimmed) return null;
  const match = /^([A-L])\s*([1-9]|1[0-3])\b/i.exec(trimmed);
  if (!match) return null;
  return `${match[1]!.toUpperCase()}${match[2]}`;
}

export function fwcEvidencePlaceLabel(
  item: FwcEvidenceMonitorRow,
  holdersById: Record<string, FwcEvidenceHolder>
): string {
  if (item.heldByAllocationId) {
    const holder = holdersById[item.heldByAllocationId];
    return holder?.country ? `Held by ${holder.country}` : "Held by character";
  }
  const current = item.currentLocation.trim();
  if (current) return current;
  const start = item.startingLocation.trim();
  if (start) return start;
  return "Unknown location";
}

export type FwcEvidenceLocationGroup = {
  key: string;
  label: string;
  grid: string | null;
  held: boolean;
  items: FwcEvidenceMonitorRow[];
};

/** Group catalog rows by where they currently are (holder wins over place text). */
export function groupFwcEvidenceByLocation(
  items: FwcEvidenceMonitorRow[],
  holders: FwcEvidenceHolder[]
): FwcEvidenceLocationGroup[] {
  const holdersById = Object.fromEntries(holders.map((holder) => [holder.id, holder]));
  const groups = new Map<string, FwcEvidenceLocationGroup>();

  for (const item of items) {
    const label = fwcEvidencePlaceLabel(item, holdersById);
    const held = Boolean(item.heldByAllocationId);
    const grid = held
      ? null
      : extractFwcGridFromLocation(item.currentLocation) ??
        extractFwcGridFromLocation(item.startingLocation);
    const key = held ? `held:${item.heldByAllocationId}` : `place:${label.toLowerCase()}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, { key, label, grid, held, items: [item] });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.held !== b.held) return a.held ? 1 : -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}
