import type { SupabaseClient } from "@supabase/supabase-js";
import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import {
  getDaisSeatLabelsForCommittee,
  LEGACY_DAIS_RENAMES,
} from "@/lib/dais-seat-plan";

async function reconcileLegacyDaisSeatLabels(
  supabase: SupabaseClient,
  conferenceId: string,
  committee: string | null | undefined
): Promise<void> {
  const group = committeeSessionGroupKey(committee);
  const pairs = group ? LEGACY_DAIS_RENAMES[group] : undefined;
  if (!pairs?.length) return;

  const { data: rows, error } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", conferenceId);
  if (error || !rows?.length) return;

  const existingLower = new Set(rows.map((r) => String(r.country ?? "").trim().toLowerCase()));

  for (const [fromLc, toExact] of pairs) {
    if (existingLower.has(toExact.trim().toLowerCase())) continue;
    if (!existingLower.has(fromLc)) continue;

    for (const row of rows) {
      if (String(row.country ?? "").trim().toLowerCase() !== fromLc) continue;
      const { error: upErr } = await supabase
        .from("allocations")
        .update({ country: toExact })
        .eq("id", row.id)
        .eq("conference_id", conferenceId);
      if (!upErr) {
        existingLower.delete(fromLc);
        existingLower.add(toExact.trim().toLowerCase());
      }
      break;
    }
  }
}

/**
 * Ensures each committee has one allocation row per dais seat defined for that chamber
 * (SEAMUN matrix–aligned labels). Idempotent; safe after imports or session updates.
 */
export async function ensureDaisSeatAllocations(
  supabase: SupabaseClient,
  conferenceId: string,
  committee?: string | null
): Promise<void> {
  await reconcileLegacyDaisSeatLabels(supabase, conferenceId, committee);

  const labels = [...getDaisSeatLabelsForCommittee(committee)];
  const { data: existing } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conferenceId);

  const existingNorm = new Set(
    (existing ?? []).map((r) => String(r.country ?? "").trim().toLowerCase())
  );

  const inserts: { conference_id: string; country: string; user_id: null }[] = [];
  for (const label of labels) {
    const n = label.trim().toLowerCase();
    if (!existingNorm.has(n)) {
      inserts.push({ conference_id: conferenceId, country: label, user_id: null });
      existingNorm.add(n);
    }
  }
  if (inserts.length === 0) return;

  await supabase.from("allocations").insert(inserts);
}
