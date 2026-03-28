import type { SupabaseClient } from "@supabase/supabase-js";
import { DAIS_SEAT_CO_CHAIR, DAIS_SEAT_HEAD_CHAIR } from "@/lib/allocation-display-order";

/**
 * Ensures each committee has unassigned Head Chair and Co-chair rows (canonical labels).
 * Idempotent; safe to call after imports or session updates.
 */
export async function ensureDaisSeatAllocations(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conferenceId);

  const labels = (existing ?? []).map((r) => (r.country ?? "").trim().toLowerCase());
  const hasHead = labels.some((c) => c === "head chair");
  const hasCo = labels.some((c) => c === "co-chair" || c === "co chair");

  const inserts: { conference_id: string; country: string; user_id: null }[] = [];
  if (!hasHead) {
    inserts.push({ conference_id: conferenceId, country: DAIS_SEAT_HEAD_CHAIR, user_id: null });
  }
  if (!hasCo) {
    inserts.push({ conference_id: conferenceId, country: DAIS_SEAT_CO_CHAIR, user_id: null });
  }
  if (inserts.length === 0) return;

  await supabase.from("allocations").insert(inserts);
}
