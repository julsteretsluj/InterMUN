import {
  dedupeAllocationsByUserId,
  mergeAllocationsAcrossSiblingConferences,
} from "@/lib/conference-committee-canonical";
import { sortAllocationsByDisplayCountry } from "@/lib/allocation-display-order";

export type AllocationRecipientOption = { id: string; country: string };
export type ChairRecipientOption = { id: string; name: string };

/** One roster line per linked delegate (and per unlinked seat) across sibling conference rows. */
export function buildAllocationRecipientOptions<
  T extends { id: string; country: string | null; user_id: string | null; conference_id: string },
>(rows: T[], canonicalConferenceId: string): AllocationRecipientOption[] {
  const assigned = rows.filter((a) => Boolean(a.user_id));
  const merged = mergeAllocationsAcrossSiblingConferences(assigned, canonicalConferenceId);
  const deduped = dedupeAllocationsByUserId(merged);
  const byId = new Map<string, AllocationRecipientOption>();
  for (const a of deduped) {
    if (!byId.has(a.id)) {
      byId.set(a.id, { id: a.id, country: (a.country ?? "").trim() || "—" });
    }
  }
  return sortAllocationsByDisplayCountry([...byId.values()]);
}

export function buildChairRecipientOptions(
  chairs: { id: string; name: string | null }[],
  chairFallback: string
): ChairRecipientOption[] {
  const byId = new Map<string, ChairRecipientOption>();
  for (const c of chairs) {
    if (!byId.has(c.id)) {
      byId.set(c.id, { id: c.id, name: c.name?.trim() || chairFallback });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** Collapse duplicate recipient rows when rendering a note (same allocation / chair twice). */
export function dedupeDelegationRecipientRows<
  T extends {
    recipient_kind: "allocation" | "chair" | "chair_all";
    recipient_allocation_id: string | null;
    recipient_profile_id: string | null;
  },
>(rows: T[]): T[] {
  const out: T[] = [];
  const seenAlloc = new Set<string>();
  const seenChair = new Set<string>();
  let seenChairAll = false;
  for (const r of rows) {
    if (r.recipient_kind === "allocation") {
      const id = r.recipient_allocation_id;
      if (!id || seenAlloc.has(id)) continue;
      seenAlloc.add(id);
      out.push(r);
    } else if (r.recipient_kind === "chair") {
      const id = r.recipient_profile_id;
      if (!id || seenChair.has(id)) continue;
      seenChair.add(id);
      out.push(r);
    } else if (r.recipient_kind === "chair_all") {
      if (seenChairAll) continue;
      seenChairAll = true;
      out.push(r);
    }
  }
  return out;
}
