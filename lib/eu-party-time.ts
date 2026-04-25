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

export const EU_PARTY_SPEECH_SHARE: Record<EuPartyKey, number> = {
  s_and_d: 0.261,
  epp: 0.217,
  renew: 0.174,
  left: 0.087,
  green: 0.087,
  c_and_r: 0.087,
  patriots: 0.087,
  independents: 0.087,
};

export type EuPartySecondsBreakdown = {
  party: EuPartyKey;
  baseSeconds: number;
  proportionalSeconds: number;
  totalSeconds: number;
};

export function deriveDefaultEuPartySeatCounts(totalDelegates: number): Record<EuPartyKey, number> {
  const safeTotal = Math.max(8, Math.floor(totalDelegates));
  const byParty = {} as Record<EuPartyKey, number>;
  for (const key of EU_PARLIAMENT_PARTY_KEYS) {
    byParty[key] = Math.max(1, Math.round(safeTotal * EU_PARTY_SPEECH_SHARE[key]));
  }
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

  const basePool = Math.floor(speechSeconds / 2);
  const proportionalPool = Math.max(0, speechSeconds - basePool);
  const basePerParty = Math.floor(basePool / EU_PARLIAMENT_PARTY_KEYS.length);

  const breakdown = EU_PARLIAMENT_PARTY_KEYS.map((party) => {
    const proportionalSeconds = Math.floor(proportionalPool * EU_PARTY_SPEECH_SHARE[party]);
    const total = basePerParty + proportionalSeconds;
    return {
      party,
      baseSeconds: basePerParty,
      proportionalSeconds,
      totalSeconds: total,
    };
  });

  const assigned = breakdown.reduce((sum, row) => sum + row.totalSeconds, 0);
  const remainder = Math.max(0, speechSeconds - assigned);
  if (remainder > 0) {
    breakdown[0]!.totalSeconds += remainder;
    breakdown[0]!.proportionalSeconds += remainder;
  }

  return { speechSeconds, inquirySeconds, breakdown };
}

export function formatSecondsAsMinSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
