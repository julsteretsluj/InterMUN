import type { SupabaseClient } from "@supabase/supabase-js";
import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import {
  getDaisSeatLabelsForCommittee,
  LEGACY_DAIS_RENAMES,
} from "@/lib/dais-seat-plan";
import { committeeHintForSmtDaisPlan } from "@/lib/smt-conference-filters";

const LEGACY_PARLIAMENTARIAN_TIER_LABELS = [
  "Parliamentarian (Beginner)",
  "Parliamentarian (Intermediate)",
  "Parliamentarian (Advanced)",
] as const;

/** Drop obsolete tier-suffixed parliamentarian seats so Multiset insert can seed exactly three plain "Parliamentarian" rows. */
async function deleteLegacyParliamentarianTierAllocationRows(
  supabase: SupabaseClient,
  conferenceId: string,
  effectiveCommittee: string | null | undefined
): Promise<void> {
  if (committeeSessionGroupKey(effectiveCommittee) !== "SMT") return;
  await supabase
    .from("allocations")
    .delete()
    .eq("conference_id", conferenceId)
    .in("country", [...LEGACY_PARLIAMENTARIAN_TIER_LABELS]);
}

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
 * Drop duplicate legacy committee-chair rows when canonical secretariat titles already exist.
 * Runs without relying on `committee` hint (often null in DB); safe for real chambers because they
 * never mix "Secretary General" with "Head Chair".
 */
async function removeDuplicateChairRowsWhenSecretariatTitlesExist(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", conferenceId);
  if (error || !rows?.length) return;

  const lower = (s: string | null | undefined) => String(s ?? "").trim().toLowerCase();
  const countries = new Set(rows.map((r) => lower(r.country)));

  for (const r of rows) {
    const k = lower(r.country);
    const dropHc = k === "head chair" && countries.has("secretary general");
    const dropCc =
      (k === "co-chair" || k === "co chair") && countries.has("deputy secretary general");
    if (!dropHc && !dropCc) continue;
    await supabase.from("allocations").delete().eq("id", r.id).eq("conference_id", conferenceId);
  }
}

/** Remove leftover legacy chair rows on SMT sheet after migrate (hint known). */
async function removeObsoleteSmtLegacyChairRows(
  supabase: SupabaseClient,
  conferenceId: string,
  committee: string | null | undefined
): Promise<void> {
  const isSmtHint = committeeSessionGroupKey(committee) === "SMT";
  if (!isSmtHint) return;

  const { data: rows, error } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", conferenceId);
  if (error || !rows?.length) return;

  const lower = (s: string | null | undefined) => String(s ?? "").trim().toLowerCase();
  const countries = new Set(rows.map((r) => lower(r.country)));
  const hasLeadership = countries.has("secretary general") || countries.has("deputy secretary general");
  if (!hasLeadership) return;

  const legacy = new Set(["head chair", "co-chair", "co chair"]);
  for (const r of rows) {
    if (!legacy.has(lower(r.country))) continue;
    await supabase.from("allocations").delete().eq("id", r.id).eq("conference_id", conferenceId);
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
  let effectiveCommittee = committee ?? null;
  if (committeeSessionGroupKey(effectiveCommittee) !== "SMT") {
    const { data: conf } = await supabase
      .from("conferences")
      .select("committee, committee_code")
      .eq("id", conferenceId)
      .maybeSingle();
    const hint = conf ? committeeHintForSmtDaisPlan(conf) : null;
    if (hint === "SMT") effectiveCommittee = "SMT";
  }

  await reconcileLegacyDaisSeatLabels(supabase, conferenceId, effectiveCommittee);
  await deleteLegacyParliamentarianTierAllocationRows(supabase, conferenceId, effectiveCommittee);
  await removeDuplicateChairRowsWhenSecretariatTitlesExist(supabase, conferenceId);

  const labels = [...getDaisSeatLabelsForCommittee(effectiveCommittee)];
  const { data: existing } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conferenceId);

  const lower = (s: string | null | undefined) => String(s ?? "").trim().toLowerCase();
  const canonicalFor = (n: string) => labels.find((l) => lower(l) === n) ?? n;

  const desiredCounts = new Map<string, number>();
  for (const label of labels) {
    const n = lower(label);
    desiredCounts.set(n, (desiredCounts.get(n) ?? 0) + 1);
  }
  const existingCounts = new Map<string, number>();
  for (const r of existing ?? []) {
    const n = lower(r.country);
    existingCounts.set(n, (existingCounts.get(n) ?? 0) + 1);
  }

  const inserts: { conference_id: string; country: string; user_id: null }[] = [];
  for (const [n, want] of desiredCounts) {
    const have = existingCounts.get(n) ?? 0;
    const need = Math.max(0, want - have);
    const country = canonicalFor(n);
    for (let i = 0; i < need; i++) {
      inserts.push({ conference_id: conferenceId, country, user_id: null });
    }
  }
  if (inserts.length > 0) {
    const { error: batchErr } = await supabase.from("allocations").insert(inserts);
    if (batchErr) {
      for (const row of inserts) {
        await supabase.from("allocations").insert(row);
      }
    }
  }

  await removeObsoleteSmtLegacyChairRows(supabase, conferenceId, effectiveCommittee);
  await removeDuplicateChairRowsWhenSecretariatTitlesExist(supabase, conferenceId);
  if (committeeSessionGroupKey(effectiveCommittee) === "SMT") {
    await deleteExcessUnassignedSmtParliamentarianRows(supabase, conferenceId);
  }
}

/** Matrix allows only three "Parliamentarian" rows; drop unassigned extras (highest id first). */
async function deleteExcessUnassignedSmtParliamentarianRows(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("allocations")
    .select("id, user_id, country")
    .eq("conference_id", conferenceId)
    .order("id", { ascending: true });
  if (error || !rows?.length) return;

  const par = rows.filter(
    (r) => String(r.country ?? "").trim().toLowerCase() === "parliamentarian"
  );
  if (par.length <= 3) return;

  for (const row of par.slice(3)) {
    if (row.user_id) continue;
    await supabase.from("allocations").delete().eq("id", row.id);
  }
}
