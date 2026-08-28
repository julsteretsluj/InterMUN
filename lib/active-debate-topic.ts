// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import {
  committeeTabKey,
  getCommitteeAwardScope,
} from "@/lib/conference-committee-canonical";

export type DebateTopicOption = { id: string; label: string };

export type ActiveDebateTopicPayload = {
  topic_conference_id?: string | null;
  day1_topic_conference_id?: string | null;
  day2_topic_conference_id?: string | null;
};

export function parseActiveDebateTopicPayload(raw: unknown): ActiveDebateTopicPayload {
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const asId = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  return {
    topic_conference_id: asId(row.topic_conference_id),
    day1_topic_conference_id: asId(row.day1_topic_conference_id),
    day2_topic_conference_id: asId(row.day2_topic_conference_id),
  };
}

/** Remaining sibling after the first agenda topic — typically the day-2 topic. */
export function otherTopicIdForDay2(orderedSiblingIds: string[], firstTopicId: string): string | null {
  const others = orderedSiblingIds.filter((id) => id !== firstTopicId);
  return others[0] ?? null;
}

export function resolveAgendaDayTopicIds(input: {
  topics: { id: string; name: string }[];
  stored: ActiveDebateTopicPayload;
  setAgendaFirstTopicName?: string | null;
}): { day1: string | null; day2: string | null } {
  const ids = input.topics.map((t) => t.id);
  const storedDay1 =
    input.stored.day1_topic_conference_id && ids.includes(input.stored.day1_topic_conference_id)
      ? input.stored.day1_topic_conference_id
      : null;
  const storedDay2 =
    input.stored.day2_topic_conference_id && ids.includes(input.stored.day2_topic_conference_id)
      ? input.stored.day2_topic_conference_id
      : null;
  if (storedDay1) {
    return { day1: storedDay1, day2: storedDay2 ?? otherTopicIdForDay2(ids, storedDay1) };
  }
  const wanted = input.setAgendaFirstTopicName?.trim() ?? "";
  if (!wanted) return { day1: null, day2: null };
  const first = input.topics.find((t) => t.name.trim() === wanted);
  if (!first) return { day1: null, day2: null };
  return { day1: first.id, day2: otherTopicIdForDay2(ids, first.id) };
}

export type ResolvedDebateConferenceBundle = {
  debateConferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  debateTopicOptions: DebateTopicOption[];
  /** Raw `conferences.committee` for the canonical row — agenda topics belong under this chamber. */
  committeeLabelRaw: string | null;
};

/**
 * Resolves which `conferences.id` should drive live floor state for this committee tab.
 * Stored on the canonical committee row in `committee_synced_state` (`active_debate_topic`).
 */
export async function getResolvedDebateConferenceBundle(
  supabase: SupabaseClient,
  activeConferenceId: string
): Promise<ResolvedDebateConferenceBundle> {
  const scope = await getCommitteeAwardScope(supabase, activeConferenceId);
  const { canonicalConferenceId, siblingConferenceIds: siblings } = scope;

  const [{ data: anchor }, { data: syncRow }] = await Promise.all([
    supabase
      .from("conferences")
      .select("id, name, committee, committee_code")
      .eq("id", activeConferenceId)
      .maybeSingle(),
    supabase
      .from("committee_synced_state")
      .select("payload")
      .eq("conference_id", canonicalConferenceId)
      .eq("state_key", COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC)
      .maybeSingle(),
  ]);

  const payload = parseActiveDebateTopicPayload(syncRow?.payload);
  const storedTopicId = payload.topic_conference_id;

  const { data: topicRows } = await supabase
    .from("conferences")
    .select("id, name, created_at, committee, committee_code")
    .in("id", siblings)
    .order("created_at", { ascending: true });

  const allRows = topicRows ?? [];
  const anchorKey = anchor ? committeeTabKey(anchor) : null;
  let alignedRows = anchorKey
    ? allRows.filter((r) => committeeTabKey(r) === anchorKey)
    : allRows;

  const ensureIds = new Set<string>([activeConferenceId, canonicalConferenceId]);
  if (storedTopicId && siblings.includes(storedTopicId)) ensureIds.add(storedTopicId);
  for (const id of ensureIds) {
    if (!alignedRows.some((r) => r.id === id) && siblings.includes(id)) {
      const row = allRows.find((r) => r.id === id);
      if (row) alignedRows = [...alignedRows, row];
    }
  }
  if (alignedRows.length === 0) alignedRows = allRows;

  alignedRows.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const safeSiblingIds = alignedRows.map((r) => r.id);
  const siblingSet = new Set(safeSiblingIds.length ? safeSiblingIds : siblings);
  const storedPick = storedTopicId && siblingSet.has(storedTopicId) ? storedTopicId : null;
  const picked =
    storedPick ??
    (siblingSet.has(activeConferenceId) ? activeConferenceId : safeSiblingIds[0] ?? activeConferenceId);

  const debateTopicOptions: DebateTopicOption[] = alignedRows.map((t) => ({
    id: t.id,
    label: (t.name ?? "").trim() || "Untitled topic",
  }));

  const committeeLabelRaw =
    alignedRows.find((r) => r.id === canonicalConferenceId)?.committee?.trim() ??
    alignedRows[0]?.committee?.trim() ??
    anchor?.committee?.trim() ??
    null;

  return {
    debateConferenceId: picked,
    canonicalConferenceId,
    siblingConferenceIds: safeSiblingIds.length ? safeSiblingIds : siblings,
    debateTopicOptions,
    committeeLabelRaw,
  };
}
