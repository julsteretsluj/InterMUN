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

/** When several topic rows share one gate code, prefer a conference that already has allocations. */
async function pickConferenceIdFromMatches(
  supabase: SupabaseClient,
  ids: string[]
): Promise<string | null> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return null;
  if (uniq.length === 1) return uniq[0]!;

  const { data: allocRows } = await supabase
    .from("allocations")
    .select("conference_id")
    .in("conference_id", uniq);
  const withAlloc = new Set(
    (allocRows ?? []).map((a) => a.conference_id).filter((id): id is string => Boolean(id))
  );
  const preferred = uniq.find((id) => withAlloc.has(id));
  if (preferred) return preferred;
  return [...uniq].sort()[0] ?? null;
}

/**
 * Second gate: match committee_code, then room_code, for the active event (case-insensitive).
 * Multiple conferences may share the same code (one chamber, several topics); picks a stable id.
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
    .ilike("committee_code", pattern);

  if (!byCommittee.error && byCommittee.data?.length) {
    const picked = await pickConferenceIdFromMatches(
      supabase,
      byCommittee.data.map((r) => r.id).filter((id): id is string => Boolean(id))
    );
    if (picked) return picked;
  }

  const byRoom = await supabase
    .from("conferences")
    .select("id")
    .eq("event_id", eventId)
    .ilike("room_code", pattern);

  if (!byRoom.error && byRoom.data?.length) {
    return pickConferenceIdFromMatches(
      supabase,
      byRoom.data.map((r) => r.id).filter((id): id is string => Boolean(id))
    );
  }

  return null;
}
