// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";

export type DelegateDisciplineFlags = {
  allocation_id: string;
  warning_count: number;
  strike_count: number;
  voting_rights_lost: boolean;
  speaking_rights_suspended: boolean;
  removed_from_committee: boolean;
};

export function parseDisciplineRow(row: {
  allocation_id?: string | null;
  warning_count?: number | null;
  strike_count?: number | null;
  voting_rights_lost?: boolean | null;
  speaking_rights_suspended?: boolean | null;
  removed_from_committee?: boolean | null;
} | null | undefined): DelegateDisciplineFlags | null {
  if (!row?.allocation_id) return null;
  return {
    allocation_id: row.allocation_id,
    warning_count: Math.max(0, Number(row.warning_count ?? 0)),
    strike_count: Math.max(0, Number(row.strike_count ?? 0)),
    voting_rights_lost: row.voting_rights_lost === true,
    speaking_rights_suspended: row.speaking_rights_suspended === true,
    removed_from_committee: row.removed_from_committee === true,
  };
}

export function canRecordVote(flags: DelegateDisciplineFlags | null | undefined): boolean {
  return !(flags?.voting_rights_lost || flags?.removed_from_committee);
}

export function canRequestOrJoinSpeakerList(
  flags: DelegateDisciplineFlags | null | undefined
): boolean {
  return !(flags?.speaking_rights_suspended || flags?.removed_from_committee);
}

export function disciplineVoteBlockMessage(
  flags: DelegateDisciplineFlags | null | undefined
): string | null {
  if (!flags) return null;
  if (flags.removed_from_committee) {
    return "This delegate was removed from committee and cannot vote.";
  }
  if (flags.voting_rights_lost) {
    return "This delegate lost voting rights due to disciplinary strike(s).";
  }
  return null;
}

export function disciplineSpeakBlockMessage(
  flags: DelegateDisciplineFlags | null | undefined
): string | null {
  if (!flags) return null;
  if (flags.removed_from_committee) {
    return "This delegate was removed from committee and cannot be added to the speaker list.";
  }
  if (flags.speaking_rights_suspended) {
    return "Speaking rights are suspended for this delegate (2+ strikes).";
  }
  return null;
}

export async function fetchDisciplineByAllocationIds(
  supabase: SupabaseClient,
  conferenceId: string,
  allocationIds: string[]
): Promise<Record<string, DelegateDisciplineFlags>> {
  const ids = [...new Set(allocationIds.filter(Boolean))];
  if (!conferenceId || ids.length === 0) return {};
  const { data, error } = await supabase
    .from("chair_delegate_discipline")
    .select(
      "allocation_id, warning_count, strike_count, voting_rights_lost, speaking_rights_suspended, removed_from_committee"
    )
    .eq("conference_id", conferenceId)
    .in("allocation_id", ids);
  if (error) throw error;
  const out: Record<string, DelegateDisciplineFlags> = {};
  for (const row of data ?? []) {
    const parsed = parseDisciplineRow(row);
    if (parsed) out[parsed.allocation_id] = parsed;
  }
  return out;
}

export async function fetchDisciplineForAllocation(
  supabase: SupabaseClient,
  conferenceId: string,
  allocationId: string
): Promise<DelegateDisciplineFlags | null> {
  const { data, error } = await supabase
    .from("chair_delegate_discipline")
    .select(
      "allocation_id, warning_count, strike_count, voting_rights_lost, speaking_rights_suspended, removed_from_committee"
    )
    .eq("conference_id", conferenceId)
    .eq("allocation_id", allocationId)
    .maybeSingle();
  if (error) throw error;
  return parseDisciplineRow(data);
}
