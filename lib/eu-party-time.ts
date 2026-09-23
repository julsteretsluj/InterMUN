// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const EU_PARLIAMENT_PARTY_KEYS = [
  "s_and_d",
  "epp",
  "renew",
  "left",
  "green",
  "c_and_r",
  "patriots",
  "independents",
] as const;

export type EuPartyKey = (typeof EU_PARLIAMENT_PARTY_KEYS)[number];

export const EU_PARTY_LABELS: Record<EuPartyKey, string> = {
  s_and_d: "Progressive Alliance of Socialists and Democrats (S&D)",
  epp: "European People's Party (EPP)",
  renew: "Renew Europe (Renew)",
  left: "The Left in the European Parliament (The Left)",
  green: "Greens/European Free Alliance (Greens/EFA)",
  c_and_r: "European Conservatives and Reformists (ECR)",
  patriots: "Patriots for Europe (PfE)",
  independents: "Non-Inscrits / Independents (NI)",
};

/**
 * Proportional speech shares from SEAMUN I 2027 EU RoP, as parts per 10_000 (sum = 10_000).
 *
 * The RoP table prints “8.7% each” for the five smaller parties, but
 * 26.1 + 21.7 + 17.4 + 8.7×5 = 108.7% — that 8.7% is (100−65.2)/4 (remainder split
 * across four parties instead of five). Correct share for each of the five is
 * (100 − 26.1 − 21.7 − 17.4) / 5 = 6.96% → 696 / 10_000.
 */
export const EU_PARTY_SPEECH_SHARE_BPS: Record<EuPartyKey, number> = {
  s_and_d: 2610,
  epp: 2170,
  renew: 1740,
  left: 696,
  green: 696,
  c_and_r: 696,
  patriots: 696,
  independents: 696,
};

const SHARE_BPS_DENOM = 10_000;

/** Decimal shares (sum ≈ 1). Prefer {@link EU_PARTY_SPEECH_SHARE_BPS} for apportionment. */
export const EU_PARTY_SPEECH_SHARE: Record<EuPartyKey, number> = Object.fromEntries(
  EU_PARLIAMENT_PARTY_KEYS.map((key) => [key, EU_PARTY_SPEECH_SHARE_BPS[key] / SHARE_BPS_DENOM])
) as Record<EuPartyKey, number>;

export type EuPartySecondsBreakdown = {
  party: EuPartyKey;
  baseSeconds: number;
  proportionalSeconds: number;
  totalSeconds: number;
};

/** Hamilton / largest-remainder over integer basis-point weights. */
function apportionByBps(total: number, bps: number[]): number[] {
  const safeTotal = Math.max(0, Math.floor(total));
  if (bps.length === 0) return [];
  if (safeTotal === 0) return bps.map(() => 0);

  const exact = bps.map((w) => (safeTotal * w) / SHARE_BPS_DENOM);
  const floors = exact.map((v) => Math.floor(v));
  let rem = safeTotal - floors.reduce((a, b) => a + b, 0);
  const byFrac = exact
    .map((v, i) => ({ i, frac: v - floors[i]! }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const out = [...floors];
  for (let k = 0; k < rem; k++) {
    const idx = byFrac[k % byFrac.length]!.i;
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return out;
}

export function deriveDefaultEuPartySeatCounts(totalDelegates: number): Record<EuPartyKey, number> {
  const n = EU_PARLIAMENT_PARTY_KEYS.length;
  const safeTotal = Math.max(n, Math.floor(totalDelegates));
  const bps = EU_PARLIAMENT_PARTY_KEYS.map((key) => EU_PARTY_SPEECH_SHARE_BPS[key]);
  // Guarantee ≥1 seat each, then Hamilton-apportion the rest so seats sum to safeTotal.
  const extras = apportionByBps(safeTotal - n, bps);
  const byParty = {} as Record<EuPartyKey, number>;
  EU_PARLIAMENT_PARTY_KEYS.forEach((key, i) => {
    byParty[key] = 1 + (extras[i] ?? 0);
  });
  return byParty;
}

/**
 * EU RoP split:
 * - Moderated caucus: split speech vs inquiry first, then split speech time by base/proportional.
 * - Consultation: entire proposed time is treated as speech time, then base/proportional split.
 */
export function calculateEuPartyTimeAllocation(params: {
  totalMinutes: number;
  mode: "moderated" | "consultation";
}): {
  speechSeconds: number;
  inquirySeconds: number;
  breakdown: EuPartySecondsBreakdown[];
} {
  const totalSeconds = Math.max(0, Math.round(params.totalMinutes * 60));
  const speechRatio =
    params.mode === "consultation" ? 1 : params.totalMinutes < 30 ? 2 / 3 : 3 / 4;
  const speechSeconds = Math.floor(totalSeconds * speechRatio);
  const inquirySeconds = Math.max(0, totalSeconds - speechSeconds);

  const n = EU_PARLIAMENT_PARTY_KEYS.length;
  const bps = EU_PARLIAMENT_PARTY_KEYS.map((key) => EU_PARTY_SPEECH_SHARE_BPS[key]);
  const basePool = Math.floor(speechSeconds / 2);
  const proportionalPool = Math.max(0, speechSeconds - basePool);
  const basePerParty = Math.floor(basePool / n);
  const baseLeftover = Math.max(0, basePool - basePerParty * n);
  const baseExtra = apportionByBps(baseLeftover, bps);
  const proportionalSeconds = apportionByBps(proportionalPool, bps);

  const breakdown: EuPartySecondsBreakdown[] = EU_PARLIAMENT_PARTY_KEYS.map((party, i) => {
    const baseSeconds = basePerParty + (baseExtra[i] ?? 0);
    const prop = proportionalSeconds[i] ?? 0;
    return {
      party,
      baseSeconds,
      proportionalSeconds: prop,
      totalSeconds: baseSeconds + prop,
    };
  });

  return { speechSeconds, inquirySeconds, breakdown };
}

export function formatSecondsAsMinSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
