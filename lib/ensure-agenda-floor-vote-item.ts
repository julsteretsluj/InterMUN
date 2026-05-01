import type { SupabaseClient } from "@supabase/supabase-js";

/** Synthetic vote item: agenda Yes/No recording without a formal motion or voting_procedure. */
export const AGENDA_FLOOR_PROCEDURE_CODE = "agenda_floor" as const;

export function isAgendaFloorVoteItem(row: {
  vote_type?: string | null;
  procedure_code?: string | null;
}): boolean {
  return (
    row.procedure_code === AGENDA_FLOOR_PROCEDURE_CODE ||
    String(row.vote_type ?? "").toLowerCase() === "agenda"
  );
}

/**
 * Ensures a single open `vote_items` row per conference for floor agenda voting.
 * Uses `open_for_voting: false` so it does not compete with the one motion open for voting.
 */
export async function ensureAgendaFloorVoteItem(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: e0 } = await supabase
    .from("vote_items")
    .select("id")
    .eq("conference_id", conferenceId)
    .eq("procedure_code", AGENDA_FLOOR_PROCEDURE_CODE)
    .maybeSingle();
  if (e0) return { error: e0.message };
  if (existing?.id) return { id: existing.id };

  const { data: conf, error: e1 } = await supabase
    .from("conferences")
    .select("name")
    .eq("id", conferenceId)
    .maybeSingle();
  if (e1) return { error: e1.message };
  const title = (conf?.name ?? "").trim() || "Agenda";

  const { data: inserted, error: e2 } = await supabase
    .from("vote_items")
    .insert({
      conference_id: conferenceId,
      vote_type: "agenda",
      title,
      procedure_code: AGENDA_FLOOR_PROCEDURE_CODE,
      must_vote: true,
      required_majority: "2/3",
      open_for_voting: false,
    })
    .select("id")
    .single();

  if (!e2 && inserted?.id) return { id: inserted.id };

  const { data: afterRace } = await supabase
    .from("vote_items")
    .select("id")
    .eq("conference_id", conferenceId)
    .eq("procedure_code", AGENDA_FLOOR_PROCEDURE_CODE)
    .maybeSingle();
  if (afterRace?.id) return { id: afterRace.id };
  if (e2) return { error: e2.message };
  return { error: "Insert returned no id" };
}
