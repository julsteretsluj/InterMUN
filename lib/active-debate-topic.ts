import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { getCommitteeAwardScope } from "@/lib/conference-committee-canonical";

export type DebateTopicOption = { id: string; label: string };

export type ResolvedDebateConferenceBundle = {
  debateConferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  debateTopicOptions: DebateTopicOption[];
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

  const { data: syncRow } = await supabase
    .from("committee_synced_state")
    .select("payload")
    .eq("conference_id", canonicalConferenceId)
    .eq("state_key", COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC)
    .maybeSingle();

  const raw = (syncRow?.payload as { topic_conference_id?: unknown } | null)?.topic_conference_id;
  const picked =
    typeof raw === "string" && siblings.includes(raw) ? raw : activeConferenceId;

  const { data: topicRows } = await supabase
    .from("conferences")
    .select("id, name, created_at")
    .in("id", siblings)
    .order("created_at", { ascending: true });

  const debateTopicOptions: DebateTopicOption[] = (topicRows ?? []).map((t) => ({
    id: t.id,
    label: (t.name ?? "").trim() || "Untitled topic",
  }));

  return {
    debateConferenceId: picked,
    canonicalConferenceId,
    siblingConferenceIds: siblings,
    debateTopicOptions,
  };
}
