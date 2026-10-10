// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { CommitteeRopConfig, RopAssetCategory, RopCharacterDef, RopDirectiveTypeDef, RopFrequencyDef, RopPowerDef } from "./types";

export type CrisisCounters = {
  crisisDay: number;
  crisisSession: number;
  /** Moderated caucuses passed so far in the simulation. */
  modCaucusCount: number;
};

export type PowerUse = {
  crisisDay: number;
  crisisSession: number;
  modCaucusIndex: number;
};

export function findCharacter(config: CommitteeRopConfig, country: string | null | undefined): RopCharacterDef | null {
  if (!country || !config.crisis) return null;
  return config.crisis.characters.find((c) => c.country === country) ?? null;
}

export function findPower(character: RopCharacterDef | null, key: string | null | undefined): RopPowerDef | null {
  if (!character || !key) return null;
  return character.powers.find((p) => p.key === key) ?? null;
}

export function findFrequency(config: CommitteeRopConfig, key: string): RopFrequencyDef | null {
  return config.crisis?.frequencies.find((f) => f.key === key) ?? null;
}

export type PowerAvailability = { ok: true; remaining: number | null } | { ok: false; reason: string; remaining: 0 };

/** Frequency check for one more use of a power. `uses` = prior non-voided uses of that power by that character. */
export function powerAvailability(
  frequency: RopFrequencyDef,
  uses: readonly PowerUse[],
  now: CrisisCounters
): PowerAvailability {
  switch (frequency.scope) {
    case "unlimited":
      return { ok: true, remaining: null };
    case "day": {
      const n = uses.filter((u) => u.crisisDay === now.crisisDay).length;
      return n < frequency.max
        ? { ok: true, remaining: frequency.max - n }
        : { ok: false, reason: `${frequency.label} — already used today.`, remaining: 0 };
    }
    case "session": {
      const n = uses.filter((u) => u.crisisDay === now.crisisDay && u.crisisSession === now.crisisSession).length;
      return n < frequency.max
        ? { ok: true, remaining: frequency.max - n }
        : { ok: false, reason: `${frequency.label} — limit reached this session.`, remaining: 0 };
    }
    case "simulation": {
      const n = uses.length;
      return n < frequency.max
        ? { ok: true, remaining: frequency.max - n }
        : { ok: false, reason: `${frequency.label} — limit reached for the simulation.`, remaining: 0 };
    }
    case "mod_caucus_window": {
      const window = frequency.window ?? 1;
      const last = uses.reduce((acc, u) => Math.max(acc, u.modCaucusIndex), -Infinity);
      if (last === -Infinity || now.modCaucusCount - last >= window) return { ok: true, remaining: 1 };
      const wait = window - (now.modCaucusCount - last);
      return {
        ok: false,
        reason: `${frequency.label} — ${wait} more moderated caucus${wait === 1 ? "" : "es"} needed.`,
        remaining: 0,
      };
    }
  }
}

/* ---------------- Movement ---------------- */

export function movementCost(terrainCosts: Record<string, number | null>, terrain: string): number | null {
  return terrainCosts[terrain] ?? null;
}

/**
 * MP available for a move into `terrain`: base pool + vehicle bonus (only on bonus terrain) − MP spent this cycle.
 */
export function movementCheck(input: {
  terrainCosts: Record<string, number | null>;
  terrain: string;
  baseMp: number;
  bonusMp: number;
  spentMp: number;
  vehicleBonusTerrain: readonly string[];
}): { ok: boolean; cost: number | null; available: number; reason: string | null } {
  const cost = movementCost(input.terrainCosts, input.terrain);
  const bonus = input.vehicleBonusTerrain.includes(input.terrain) ? input.bonusMp : 0;
  const available = Math.max(0, input.baseMp + bonus - input.spentMp);
  if (cost == null) return { ok: false, cost, available, reason: "Impassable terrain cannot be entered without special powers." };
  if (cost > available) {
    return { ok: false, cost, available, reason: `Needs ${cost} MP but only ${available} MP is left this cycle.` };
  }
  return { ok: true, cost, available, reason: null };
}

/* ---------------- Crisis pathways ---------------- */

/** Plurality winner; ties → null (chair decides). */
export function pathwayWinner(votes: readonly { pathway_key: string }[]): { key: string | null; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v.pathway_key] = (counts[v.pathway_key] ?? 0) + 1;
  let best: string | null = null;
  let bestN = 0;
  let tie = false;
  for (const [key, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = key;
      bestN = n;
      tie = false;
    } else if (n === bestN) {
      tie = true;
    }
  }
  return { key: tie ? null : best, counts };
}

/* ---------------- Results ---------------- */

export type DirectiveResultRow = {
  allocationIds: readonly string[];
  status: string;
  crisisDay: number | null;
};

export type DelegateSuccess = { submitted: number; approved: number; partial: number; rejected: number; rate: number };

const DECIDED = new Set(["approved", "approved_with_conditions", "rejected"]);

/**
 * "Exact statistics on each delegate's success rate", per day and overall.
 * Success rate = (approved + 0.5 × approved with conditions) / decided.
 */
export function delegateSuccessStats(rows: readonly DirectiveResultRow[]): {
  byDelegate: Record<string, { overall: DelegateSuccess; byDay: Record<number, DelegateSuccess> }>;
} {
  const empty = (): DelegateSuccess => ({ submitted: 0, approved: 0, partial: 0, rejected: 0, rate: 0 });
  const byDelegate: Record<string, { overall: DelegateSuccess; byDay: Record<number, DelegateSuccess> }> = {};
  const bump = (s: DelegateSuccess, status: string) => {
    s.submitted += 1;
    if (status === "approved") s.approved += 1;
    if (status === "approved_with_conditions") s.partial += 1;
    if (status === "rejected") s.rejected += 1;
  };
  for (const row of rows) {
    if (!DECIDED.has(row.status)) continue;
    for (const id of row.allocationIds) {
      const entry = (byDelegate[id] ??= { overall: empty(), byDay: {} });
      bump(entry.overall, row.status);
      const day = row.crisisDay ?? 1;
      bump((entry.byDay[day] ??= empty()), row.status);
    }
  }
  const finish = (s: DelegateSuccess) => {
    s.rate = s.submitted > 0 ? (s.approved + 0.5 * s.partial) / s.submitted : 0;
  };
  for (const entry of Object.values(byDelegate)) {
    finish(entry.overall);
    Object.values(entry.byDay).forEach(finish);
  }
  return { byDelegate };
}

// ── Directive citations (powers/assets invoked on a directive) ──

/** A power or asset cited on a directive, owned by one author's seat. */
export type CitationRef = { allocationId: string; key: string };

export type CitationAuthor = { allocationId: string; country: string | null };

export type PowerOption = {
  allocationId: string;
  key: string;
  label: string;
  summary: string | null;
  frequencyLabel: string;
  approvalNote: string | null;
  available: boolean;
  reason: string | null;
  /** Uses left in the current window; null = unlimited. */
  remaining: number | null;
};

export type AssetOption = {
  allocationId: string;
  key: string;
  label: string;
  category: RopAssetCategory;
};

export type CitationError =
  | { code: "foreign_power"; key: string }
  | { code: "foreign_asset"; key: string }
  | { code: "power_wrong_type"; key: string; label: string }
  | { code: "power_unavailable"; key: string; label: string; reason: string };

/** Seat whose character a directive is written as: the previewed seat when SMT acts for one. */
export function citationSubmitter<T>(input: { ownSeat: T | null; actingSeat: T | null }): T | null {
  return input.actingSeat ?? input.ownSeat;
}

/** Characters whose powers/assets may be cited: the submitter, plus co-authors when the type pools resources. */
export function citationAuthors(
  type: Pick<RopDirectiveTypeDef, "pooledResources" | "maxAuthors">,
  submitter: CitationAuthor,
  coAuthors: readonly CitationAuthor[]
): CitationAuthor[] {
  if (!type.pooledResources || type.maxAuthors === 1) return [submitter];
  const seen = new Set([submitter.allocationId]);
  const out = [submitter];
  for (const a of coAuthors) {
    if (seen.has(a.allocationId)) continue;
    seen.add(a.allocationId);
    out.push(a);
  }
  return out;
}

/** A power may be cited when the directive type accepts one of the power's "Type" tags. */
export function powerFitsDirectiveType(config: CommitteeRopConfig, power: RopPowerDef, typeKey: string): boolean {
  if (!power.directiveTypes.length) return true;
  const accepts = config.directives?.types.find((t) => t.key === typeKey)?.acceptsPowerTypes ?? [typeKey];
  return accepts === "any" || power.directiveTypes.some((tag) => accepts.includes(tag));
}

export const citationId = (ref: CitationRef) => `${ref.allocationId}:${ref.key}`;

/**
 * Every power the authors' characters could cite on this directive type, with frequency availability.
 * `usesByAllocation[allocationId][powerKey]` = prior non-voided uses.
 */
export function directivePowerOptions(
  config: CommitteeRopConfig,
  typeKey: string,
  authors: readonly CitationAuthor[],
  usesByAllocation: Record<string, Record<string, readonly PowerUse[]>>,
  counters: CrisisCounters
): PowerOption[] {
  const out: PowerOption[] = [];
  for (const author of authors) {
    const character = findCharacter(config, author.country);
    if (!character) continue;
    for (const power of character.powers) {
      if (!powerFitsDirectiveType(config, power, typeKey)) continue;
      const frequency = findFrequency(config, power.frequency);
      const avail = frequency
        ? powerAvailability(frequency, usesByAllocation[author.allocationId]?.[power.key] ?? [], counters)
        : ({ ok: true, remaining: null } as const);
      out.push({
        allocationId: author.allocationId,
        key: power.key,
        label: power.label,
        summary: power.summary ?? null,
        frequencyLabel: frequency?.label ?? power.frequency,
        approvalNote: power.approvalNote ?? null,
        available: avail.ok,
        reason: avail.ok ? null : avail.reason,
        remaining: avail.remaining,
      });
    }
  }
  return out;
}

export function directiveAssetOptions(config: CommitteeRopConfig, authors: readonly CitationAuthor[]): AssetOption[] {
  const out: AssetOption[] = [];
  for (const author of authors) {
    const character = findCharacter(config, author.country);
    for (const asset of character?.assets ?? []) {
      out.push({ allocationId: author.allocationId, key: asset.key, label: asset.label, category: asset.category });
    }
  }
  return out;
}

/** Drop duplicates and malformed refs; keeps the caller's order. */
export function normalizeCitations(refs: unknown): CitationRef[] {
  if (!Array.isArray(refs)) return [];
  const seen = new Set<string>();
  const out: CitationRef[] = [];
  for (const r of refs) {
    const allocationId = typeof r?.allocationId === "string" ? r.allocationId : typeof r?.allocation_id === "string" ? r.allocation_id : null;
    const key = typeof r?.key === "string" ? r.key : null;
    if (!allocationId || !key) continue;
    const id = `${allocationId}:${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ allocationId, key });
  }
  return out;
}

/**
 * Server-side check of cited powers/assets. Anything not on an eligible author's character sheet
 * is rejected; powers must suit the directive type and, when `checkAvailability`, have a use left.
 */
export function validateCitations(
  config: CommitteeRopConfig,
  input: {
    typeKey: string;
    authors: readonly CitationAuthor[];
    powers: readonly CitationRef[];
    assets: readonly CitationRef[];
    usesByAllocation?: Record<string, Record<string, readonly PowerUse[]>>;
    counters?: CrisisCounters;
    checkAvailability?: boolean;
  }
): CitationError[] {
  const errors: CitationError[] = [];
  const byAllocation = new Map(input.authors.map((a) => [a.allocationId, findCharacter(config, a.country)]));
  for (const ref of input.powers) {
    const character = byAllocation.get(ref.allocationId);
    const power = character?.powers.find((p) => p.key === ref.key);
    if (!power) {
      errors.push({ code: "foreign_power", key: ref.key });
      continue;
    }
    if (!powerFitsDirectiveType(config, power, input.typeKey)) {
      errors.push({ code: "power_wrong_type", key: power.key, label: power.label });
      continue;
    }
    if (input.checkAvailability && input.counters) {
      const frequency = findFrequency(config, power.frequency);
      if (frequency) {
        const avail = powerAvailability(frequency, input.usesByAllocation?.[ref.allocationId]?.[power.key] ?? [], input.counters);
        if (!avail.ok) errors.push({ code: "power_unavailable", key: power.key, label: power.label, reason: avail.reason });
      }
    }
  }
  for (const ref of input.assets) {
    const character = byAllocation.get(ref.allocationId);
    if (!character?.assets.some((a) => a.key === ref.key)) errors.push({ code: "foreign_asset", key: ref.key });
  }
  return errors;
}

export function describeCitationError(e: CitationError): string {
  switch (e.code) {
    case "foreign_power":
      return "A cited power doesn't belong to any eligible author's character.";
    case "foreign_asset":
      return "A cited asset doesn't belong to any eligible author's character.";
    case "power_wrong_type":
      return `${e.label} can't be used on this directive type.`;
    case "power_unavailable":
      return `${e.label}: ${e.reason}`;
  }
}

/** Readable "Power (Owner) · Power" summary kept in the legacy text columns and the AI evaluation prompt. */
export function citationSummary(
  refs: readonly CitationRef[],
  labelOf: (ref: CitationRef) => string | null,
  ownerOf: (allocationId: string) => string | null,
  showOwner: boolean
): string | null {
  const parts = refs
    .map((r) => {
      const label = labelOf(r);
      if (!label) return null;
      const owner = showOwner ? ownerOf(r.allocationId) : null;
      return owner ? `${label} (${owner})` : label;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
