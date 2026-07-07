// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const COUNTRY_STANCE_CYCLE = ["support", "oppose", "neutral", "undecided"] as const;

export type CountryStanceLabel = (typeof COUNTRY_STANCE_CYCLE)[number];

export type CountryStanceMap = Record<string, CountryStanceLabel>;

export function parseCountryStanceMap(raw: unknown): CountryStanceMap {
  if (!raw || typeof raw !== "object") return {};
  const out: CountryStanceMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const country = key.trim();
    if (!country) continue;
    if (value === "support" || value === "oppose" || value === "neutral" || value === "undecided") {
      out[country] = value;
    }
  }
  return out;
}

export function cycleCountryStance(current: CountryStanceLabel | undefined): CountryStanceLabel {
  const idx = COUNTRY_STANCE_CYCLE.indexOf(current ?? "undecided");
  return COUNTRY_STANCE_CYCLE[(idx + 1) % COUNTRY_STANCE_CYCLE.length]!;
}
