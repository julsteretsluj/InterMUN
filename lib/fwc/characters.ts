// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { FwcCharacterCatalogEntry } from "@/lib/fwc/types";

/** Allocation `country` labels already in the FWC matrix. */
export const FWC_CHARACTER_COUNTRIES = [
  "Agent Connie Frazier",
  "Colonel KGB",
  "Dr. Martin Brenner",
  "Dr. Sam Owens",
  "Eleven (011/Jane Ives)",
  "Henry Creel (001/Vecna)",
  "Jim Hopper",
  "Joyce Byers",
  "Kali Prasad (008)",
  "Lt. Colonel Jack Sullivan",
] as const;

export type FwcCharacterCountry = (typeof FWC_CHARACTER_COUNTRIES)[number];

export const FWC_CHARACTERS: Record<FwcCharacterCountry, FwcCharacterCatalogEntry> = {
  "Agent Connie Frazier": {
    country: "Agent Connie Frazier",
    displayName: "Agent Connie Frazier",
    aliases: ["Connie Frazier", "Connie", "Frazier", "DoE Covert Ops"],
    baseMp: 4,
    baseGrid: "B2",
    bonusMp: 2,
    vehicleLabel: "DoE unmarked surveillance & wiretap vans",
    powersAndAssets:
      "DoE covert ops from Hawkins Lab (B2): two unmarked surveillance/wiretap vans (+2 MP on paved roads), covert strike squad, press gag orders, Sub-Level 1 clearance. Core powers: Media Blackout, Jurisdictional Override, Silence Directive.",
    anonymityEligible: true,
  },
  "Colonel KGB": {
    country: "Colonel KGB",
    displayName: "Colonel Grigori (Soviet KGB / GRU)",
    aliases: [
      "Colonel Grigori",
      "Grigori",
      "KGB",
      "Soviet KGB",
      "GRU",
      "Colonel Grigori (Soviet KGB / GRU)",
    ],
    baseMp: 3,
    baseGrid: "J10",
    bonusMp: 0,
    vehicleLabel: null,
    powersAndAssets:
      "Soviet KGB/GRU from the Starcourt sub-level (J10): industrial dimensional portal drill (not a road bonus), Spetsnaz infiltration platoon, forged US IDs, encrypted shortwave. Core powers: Red Breach, Soviet Tactical Assassination.",
    anonymityEligible: true,
  },
  "Dr. Martin Brenner": {
    country: "Dr. Martin Brenner",
    displayName: "Dr. Martin Brenner",
    aliases: ["Martin Brenner", "Brenner", "Papa"],
    baseMp: 3,
    baseGrid: "B3",
    bonusMp: 0,
    vehicleLabel: null,
    powersAndAssets:
      "Hawkins Lab isolation ward (B3): deprivation tank, MKUltra sedatives and restraints, Subjects 001–011 telemetry, armed DoE guard unit, federal executive immunity. Core powers: Papa’s Authority / MKUltra Asset Seizure, Federal Intelligence Sanction.",
    anonymityEligible: true,
  },
  "Dr. Sam Owens": {
    country: "Dr. Sam Owens",
    displayName: "Dr. Sam Owens",
    aliases: ["Sam Owens", "Owens"],
    baseMp: 4,
    baseGrid: "B4",
    bonusMp: 0,
    vehicleLabel: null,
    powersAndAssets:
      "Lab field operations (B4): bio-hazard / spore-burn units, soil kits, quarantine barriers, federal hotline, cognitive shielding drugs and triage kits. Core powers: Zone Clearance, Medical Triage, Whistleblower Protection.",
    anonymityEligible: true,
  },
  "Eleven (011/Jane Ives)": {
    country: "Eleven (011/Jane Ives)",
    displayName: "Eleven (011 / Jane Ives)",
    aliases: ["Eleven", "011", "Jane Ives", "Jane", "El"],
    baseMp: 3,
    baseGrid: "OUTER_WOODS",
    bonusMp: 0,
    vehicleLabel: null,
    powersAndAssets:
      "Secret woodland cabin (OUTER_WOODS): sensory-deprivation setup, static/CB radio, passive remote viewing. Core powers: Telekinetic Assault, Remote Viewing, Dimensional Rift Sealing/Opening, Memories of Love & Trauma (once per simulation).",
    anonymityEligible: true,
  },
  "Henry Creel (001/Vecna)": {
    country: "Henry Creel (001/Vecna)",
    displayName: "Henry Creel (001 / Vecna)",
    aliases: ["Henry Creel", "Henry", "Creel", "001", "Vecna"],
    baseMp: 5,
    baseGrid: "H8",
    bonusMp: 0,
    vehicleLabel: null,
    powersAndAssets:
      "Creel House / Hive Node (H8): interdimensional vine networks, active spore channels, Demogorgon/Demodog pack, hive-mind telepathic link. Core powers: Hive Mind Coordination, Vecna Curse, Boundary Tear.",
    anonymityEligible: true,
  },
  "Jim Hopper": {
    country: "Jim Hopper",
    displayName: "Jim Hopper",
    aliases: ["Hopper", "Chief Hopper", "Chief of Police"],
    baseMp: 4,
    baseGrid: "B8",
    bonusMp: 2,
    vehicleLabel: "HPD Blazer patrol cruiser",
    powersAndAssets:
      "Hawkins Police Department (B8): HPD Blazer cruiser (+2 MP on paved roads), 12-gauge and .357, municipal blueprints, two deputies, evidence-locker key. Core powers: Municipal Intercept, Tactical Intervention, Off-the-Grid Reconnaissance, Chief’s Mandate.",
    anonymityEligible: true,
  },
  "Joyce Byers": {
    country: "Joyce Byers",
    displayName: "Joyce Byers",
    aliases: ["Joyce", "Byers"],
    baseMp: 3,
    baseGrid: "D12",
    bonusMp: 2,
    vehicleLabel: "Civilian station wagon",
    powersAndAssets:
      "Byers Residence (D12): Christmas-light wall, alphabet map, broad-spectrum radios, civilian station wagon (+2 MP on paved roads), 35mm camera. Core powers: Grassroots Rally, Mother’s Fury, Whistleblower Exposure, Wall of Lights passive monitoring.",
    anonymityEligible: true,
  },
  "Kali Prasad (008)": {
    country: "Kali Prasad (008)",
    displayName: "Kali Prasad (008)",
    aliases: ["Kali Prasad", "Kali", "008", "Mind Mask"],
    baseMp: 4,
    baseGrid: "MOBILE",
    bonusMp: 2,
    vehicleLabel: "Modified getaway van",
    powersAndAssets:
      "Off-grid / mobile hideout (MOBILE): modified getaway van (+2 MP on paved roads), rogue crew (Axel, Dottie, Mick, Funhouse), forged IDs and disguise kits. Core powers: Mind Mask / Sensory Illusion, Guerrilla Sabotage, Retributive Strike, Sisterly Psychic Bond.",
    anonymityEligible: true,
  },
  "Lt. Colonel Jack Sullivan": {
    country: "Lt. Colonel Jack Sullivan",
    displayName: "Lt. Colonel Jack Sullivan",
    aliases: ["Jack Sullivan", "Sullivan", "Lt Colonel Jack Sullivan", "Lieutenant Colonel Jack Sullivan"],
    baseMp: 5,
    baseGrid: "CHECKPOINT",
    bonusMp: 3,
    vehicleLabel: "Armored personnel carrier (APC)",
    powersAndAssets:
      "Hawkins perimeter checkpoint (CHECKPOINT): APC (+3 MP on paved roads), radio-jamming truck, U.S. Army special-operations platoon, tracking dogs, flamethrower ordnance. Core powers: Operation Clean Sweep, Signal Jamming, Tactical Search, Scorched-Earth Ordnance.",
    anonymityEligible: true,
  },
};

export const FWC_CHARACTER_LIST: FwcCharacterCatalogEntry[] = FWC_CHARACTER_COUNTRIES.map(
  (country) => FWC_CHARACTERS[country],
);

function normalizeLookup(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[()[\]/.,_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DISTINCTIVE_TOKENS: { country: FwcCharacterCountry; tokens: readonly string[] }[] = [
  { country: "Agent Connie Frazier", tokens: ["connie", "frazier"] },
  { country: "Colonel KGB", tokens: ["kgb", "grigori", "gru"] },
  { country: "Dr. Martin Brenner", tokens: ["brenner", "papa"] },
  { country: "Dr. Sam Owens", tokens: ["owens"] },
  { country: "Eleven (011/Jane Ives)", tokens: ["eleven", "011", "jane ives", "jane"] },
  { country: "Henry Creel (001/Vecna)", tokens: ["creel", "vecna", "001", "henry"] },
  { country: "Jim Hopper", tokens: ["hopper"] },
  { country: "Joyce Byers", tokens: ["joyce", "byers"] },
  { country: "Kali Prasad (008)", tokens: ["kali", "prasad", "008"] },
  { country: "Lt. Colonel Jack Sullivan", tokens: ["sullivan"] },
];

/**
 * Resolve an allocation `country` (or a RoP / informal variant) to a catalog entry.
 * Matches exact matrix labels first, then aliases, then distinctive name tokens
 * (so “Colonel Grigori” → Colonel KGB, and “colonel” alone does not collide with Sullivan).
 */
export function lookupFwcCharacter(country: string): FwcCharacterCatalogEntry | null {
  const raw = country.trim();
  if (!raw) return null;

  if (raw in FWC_CHARACTERS) {
    return FWC_CHARACTERS[raw as FwcCharacterCountry];
  }

  const needle = normalizeLookup(raw);
  if (!needle) return null;

  for (const entry of FWC_CHARACTER_LIST) {
    if (normalizeLookup(entry.country) === needle || normalizeLookup(entry.displayName) === needle) {
      return entry;
    }
    for (const alias of entry.aliases) {
      if (normalizeLookup(alias) === needle) return entry;
    }
  }

  for (const { country: key, tokens } of DISTINCTIVE_TOKENS) {
    if (tokens.some((token) => needle === token || needle.includes(token))) {
      return FWC_CHARACTERS[key];
    }
  }

  return null;
}
