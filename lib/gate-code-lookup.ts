import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Escape ILIKE metacharacters so the pattern is an exact match (case-insensitive).
 * Uses backslash escape (PostgreSQL default for LIKE/ILIKE).
 */
export function escapeForIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** First gate: match conference_events.event_code (case-insensitive). */
export async function findEventIdByEventCode(
  supabase: SupabaseClient,
  normalizedEventCode: string
): Promise<string | null> {
  const pattern = escapeForIlikeExact(normalizedEventCode);
  const { data, error } = await supabase
    .from("conference_events")
    .select("id")
    .ilike("event_code", pattern)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data.id;
}

/**
 * Second gate: match committee_code, then room_code, for the active event (case-insensitive).
 */
export async function findConferenceIdBySecondGateCode(
  supabase: SupabaseClient,
  eventId: string,
  normalizedCommitteeCode: string
): Promise<string | null> {
  const pattern = escapeForIlikeExact(normalizedCommitteeCode);

  const byCommittee = await supabase
    .from("conferences")
    .select("id")
    .eq("event_id", eventId)
    .ilike("committee_code", pattern)
    .maybeSingle();

  if (!byCommittee.error && byCommittee.data?.id) {
    return byCommittee.data.id;
  }

  const byRoom = await supabase
    .from("conferences")
    .select("id")
    .eq("event_id", eventId)
    .ilike("room_code", pattern)
    .maybeSingle();

  if (!byRoom.error && byRoom.data?.id) {
    return byRoom.data.id;
  }

  return null;
}
