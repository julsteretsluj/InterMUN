// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { FWC_TERRAIN_TYPES, type FwcTerrainType } from "@/lib/fwc/types";

/** MP cost to enter the destination tile. Impassable cannot be entered without special powers. */
export const FWC_TERRAIN_MP_COST: Record<FwcTerrainType, number | null> = {
  road_pavement: 1,
  building_interior: 1,
  forest_trees: 2,
  water_shallow: 2,
  corrupted_terrain: 2,
  spore_cloud: 3,
  void_deep_rift: 3,
  impassable: null,
};

export const FWC_TERRAIN_LABELS: Record<FwcTerrainType, string> = {
  road_pavement: "Road / Pavement",
  building_interior: "Building (Interior)",
  forest_trees: "Forest / Trees",
  water_shallow: "Water (Shallow)",
  corrupted_terrain: "Corrupted Terrain",
  spore_cloud: "Spore Cloud",
  void_deep_rift: "Void / Deep Rift",
  impassable: "Impassable Terrain",
};

const TERRAIN_ALIASES: Record<string, FwcTerrainType> = {
  road: "road_pavement",
  pavement: "road_pavement",
  road_pavement: "road_pavement",
  paved: "road_pavement",
  paved_road: "road_pavement",
  building: "building_interior",
  interior: "building_interior",
  building_interior: "building_interior",
  building_interior_1: "building_interior",
  forest: "forest_trees",
  trees: "forest_trees",
  forest_trees: "forest_trees",
  woods: "forest_trees",
  woodland: "forest_trees",
  water: "water_shallow",
  shallow: "water_shallow",
  water_shallow: "water_shallow",
  corrupted: "corrupted_terrain",
  corrupted_terrain: "corrupted_terrain",
  spore: "spore_cloud",
  spore_cloud: "spore_cloud",
  void: "void_deep_rift",
  rift: "void_deep_rift",
  deep_rift: "void_deep_rift",
  void_deep_rift: "void_deep_rift",
  impassable: "impassable",
  x: "impassable",
  x_mp: "impassable",
};

function normalizeTerrainToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function isFwcTerrainType(value: string | null | undefined): value is FwcTerrainType {
  return FWC_TERRAIN_TYPES.includes((value ?? "") as FwcTerrainType);
}

/** Parse RoP labels, SCREAMING_SNAKE, or snake_case into the DB terrain enum. */
export function parseFwcTerrain(raw: string | null | undefined): FwcTerrainType | null {
  const token = normalizeTerrainToken(raw ?? "");
  if (!token) return null;
  if (isFwcTerrainType(token)) return token;
  return TERRAIN_ALIASES[token] ?? null;
}

export function labelFwcTerrain(terrain: FwcTerrainType): string {
  return FWC_TERRAIN_LABELS[terrain];
}

export function fwcTerrainMpCost(terrain: FwcTerrainType): number | null {
  return FWC_TERRAIN_MP_COST[terrain];
}
