import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import {
  committeeTabKey,
  getCommitteeAwardScope,
} from "@/lib/conference-committee-canonical";

export type DebateTopicOption = { id: string; label: string };

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

  const raw = (syncRow?.payload as { topic_conference_id?: unknown } | null)?.topic_conference_id;

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
  if (typeof raw === "string" && siblings.includes(raw)) ensureIds.add(raw);
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
  const storedPick = typeof raw === "string" && siblingSet.has(raw) ? raw : null;
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
