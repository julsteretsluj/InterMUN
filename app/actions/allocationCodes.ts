"use server";

import { createClient } from "@/lib/supabase/server";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { resolveCanonicalCommitteeConferenceId } from "@/lib/conference-committee-canonical";
import { randomBytes } from "crypto";

function randomCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function requireChairOrSmt() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null, ok: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    return { supabase, user, role, ok: false as const };
  }
  return { supabase, user, role, ok: true as const };
}

/** Chairs are limited to their active committee (room / dashboard context). SMT and admin are not. */
async function assertChairOwnsConference(
  role: string | null | undefined,
  conferenceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (role !== "chair") return { ok: true };
  const active = await getConferenceForDashboard({ role });
  if (!active) {
    return { ok: false, error: "You can only manage codes for your committee." };
  }
  const supabase = await createClient();
  const [activeCanon, topicCanon] = await Promise.all([
    resolveCanonicalCommitteeConferenceId(supabase, active.id),
    resolveCanonicalCommitteeConferenceId(supabase, conferenceId),
  ]);
  if (activeCanon !== topicCanon) {
    return { ok: false, error: "You can only manage codes for your committee." };
  }
  return { ok: true };
}

export async function saveAllocationCode(allocationId: string, code: string) {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { error: "Only chairs, SMT, and website admins can update allocation codes." };
  }

  const trimmed = code.trim();
  const supabase = auth.supabase;

  const { data: alloc } = await supabase
    .from("allocations")
    .select("conference_id")
    .eq("id", allocationId)
    .maybeSingle();
  if (!alloc?.conference_id) {
    return { error: "Allocation not found." };
  }
  const scope = await assertChairOwnsConference(auth.role, alloc.conference_id);
  if (!scope.ok) return { error: scope.error };

  if (!trimmed) {
    const { error } = await supabase
      .from("allocation_gate_codes")
      .delete()
      .eq("allocation_id", allocationId);
    if (error) return { error: error.message };
    return { success: true as const };
  }

  const { error } = await supabase.from("allocation_gate_codes").upsert(
    {
      allocation_id: allocationId,
      code: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "allocation_id" }
  );

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function generateMissingAllocationCodes(conferenceId: string) {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { error: "Only chairs, SMT, and website admins can generate codes." };
  }

  const scope = await assertChairOwnsConference(auth.role, conferenceId);
  if (!scope.ok) return { error: scope.error };

  const supabase = auth.supabase;

  const canonicalId = await resolveCanonicalCommitteeConferenceId(supabase, conferenceId);

  const { data: allocs, error: aErr } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", canonicalId);

  if (aErr || !allocs?.length) {
    return { error: aErr?.message ?? "No allocations for this conference." };
  }

  const ids = allocs.map((a) => a.id);
  const { data: existing } = await supabase
    .from("allocation_gate_codes")
    .select("allocation_id, code")
    .in("allocation_id", ids);

  const existingSet = new Set(
    (existing ?? [])
      .filter((r) => r.code && r.code.trim())
      .map((r) => r.allocation_id)
  );

  const toInsert = ids
    .filter((id) => !existingSet.has(id))
    .map((allocation_id) => ({
      allocation_id,
      code: randomCode(),
      updated_at: new Date().toISOString(),
    }));

  if (toInsert.length === 0) {
    return { success: true as const, generated: 0 };
  }

  const { error } = await supabase.from("allocation_gate_codes").upsert(toInsert, {
    onConflict: "allocation_id",
  });

  if (error) return { error: error.message };
  return { success: true as const, generated: toInsert.length };
}
