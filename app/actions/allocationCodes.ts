"use server";

import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function randomCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function requireChairOrSmt() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair" && profile?.role !== "smt") {
    return { supabase, user, ok: false as const };
  }
  return { supabase, user, ok: true as const };
}

export async function saveAllocationCode(allocationId: string, code: string) {
  const auth = await requireChairOrSmt();
  if (!auth.ok || !auth.user) {
    return { error: "Only chairs and SMT can update allocation codes." };
  }

  const trimmed = code.trim();
  const supabase = auth.supabase;

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
    return { error: "Only chairs and SMT can generate codes." };
  }

  const supabase = auth.supabase;

  const { data: allocs, error: aErr } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", conferenceId);

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
