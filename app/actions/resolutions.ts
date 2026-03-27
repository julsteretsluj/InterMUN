"use server";

import { createClient } from "@/lib/supabase/server";
import { nextClauseNumber } from "@/lib/resolution-functions";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
type Role = "delegate" | "chair" | "smt" | "admin";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as Role | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, role: (profile?.role ?? null) as Role | null };
}

function isStaff(role: Role | null) {
  return role === "chair" || role === "smt" || role === "admin";
}

export async function createResolutionAction(input: {
  conferenceId: string;
  googleDocsUrl?: string;
  mainSubmitterIds: string[];
  coSubmitterIds: string[];
}): Promise<ActionResult<{ resolutionId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only staff can create resolutions." };
  }
  if (!isUuid(input.conferenceId)) return { ok: false, error: "Invalid conference id." };

  const mainSubmitters = Array.from(
    new Set([...input.mainSubmitterIds.map((s) => s.trim()).filter(Boolean), auth.user.id])
  ).filter(isUuid);
  const coSubmitters = Array.from(
    new Set(input.coSubmitterIds.map((s) => s.trim()).filter(Boolean))
  ).filter(isUuid);

  const { data: created, error } = await auth.supabase
    .from("resolutions")
    .insert({
      conference_id: input.conferenceId,
      google_docs_url: input.googleDocsUrl?.trim() || null,
      main_submitters: mainSubmitters,
      co_submitters: coSubmitters,
      signatories: [],
    })
    .select("id")
    .single();
  if (error || !created?.id) return { ok: false, error: error?.message ?? "Failed to create." };

  const { error: blocErr } = await auth.supabase.from("blocs").insert([
    { resolution_id: created.id, name: "A", stance: "for" },
    { resolution_id: created.id, name: "B", stance: "against" },
  ]);
  if (blocErr) return { ok: false, error: blocErr.message };

  return { ok: true, data: { resolutionId: created.id } };
}

export async function addClauseAction(input: {
  conferenceId: string;
  resolutionId: string;
  clauseText: string;
}): Promise<ActionResult<{ clauseId: string; clauseNumber: number }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only staff can edit clauses." };
  }
  if (!isUuid(input.conferenceId) || !isUuid(input.resolutionId)) {
    return { ok: false, error: "Invalid IDs." };
  }
  const text = input.clauseText.trim();
  if (!text) return { ok: false, error: "Clause text is required." };

  const { data: existing, error: existingErr } = await auth.supabase
    .from("resolution_clauses")
    .select("clause_number")
    .eq("resolution_id", input.resolutionId);
  if (existingErr) return { ok: false, error: existingErr.message };

  const clauseNumber = nextClauseNumber((existing ?? []).map((r) => r.clause_number));
  const { data: inserted, error } = await auth.supabase
    .from("resolution_clauses")
    .insert({
      conference_id: input.conferenceId,
      resolution_id: input.resolutionId,
      clause_number: clauseNumber,
      clause_text: text,
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (error || !inserted?.id) return { ok: false, error: error?.message ?? "Failed to add clause." };

  return { ok: true, data: { clauseId: inserted.id, clauseNumber } };
}

export async function updateClauseAction(input: {
  clauseId: string;
  clauseText: string;
}): Promise<ActionResult<{ clauseId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only staff can edit clauses." };
  }
  if (!isUuid(input.clauseId)) return { ok: false, error: "Invalid clause id." };
  const text = input.clauseText.trim();
  if (!text) return { ok: false, error: "Clause text is required." };

  const { error } = await auth.supabase
    .from("resolution_clauses")
    .update({ clause_text: text, updated_at: new Date().toISOString() })
    .eq("id", input.clauseId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { clauseId: input.clauseId } };
}

export async function deleteClauseAction(input: {
  clauseId: string;
}): Promise<ActionResult<{ clauseId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only staff can delete clauses." };
  }
  if (!isUuid(input.clauseId)) return { ok: false, error: "Invalid clause id." };

  const { error } = await auth.supabase.from("resolution_clauses").delete().eq("id", input.clauseId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { clauseId: input.clauseId } };
}

export async function signResolutionAction(input: {
  resolutionId: string;
}): Promise<ActionResult<{ resolutionId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user || auth.role !== "delegate") {
    return { ok: false, error: "Only delegates can sign resolutions." };
  }
  if (!isUuid(input.resolutionId)) return { ok: false, error: "Invalid resolution id." };

  const { error } = await auth.supabase.from("signatory_requests").insert({
    resolution_id: input.resolutionId,
    user_id: auth.user.id,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { resolutionId: input.resolutionId } };
}

export async function joinBlocAction(input: {
  resolutionId: string;
  blocId: string;
}): Promise<ActionResult<{ resolutionId: string; blocId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user || auth.role !== "delegate") {
    return { ok: false, error: "Only delegates can join blocs." };
  }
  if (!isUuid(input.resolutionId) || !isUuid(input.blocId)) {
    return { ok: false, error: "Invalid IDs." };
  }

  const { data: resolutionBlocs, error: blocReadErr } = await auth.supabase
    .from("blocs")
    .select("id")
    .eq("resolution_id", input.resolutionId);
  if (blocReadErr) return { ok: false, error: blocReadErr.message };
  const allowedBlocIds = new Set((resolutionBlocs ?? []).map((b) => b.id));
  if (!allowedBlocIds.has(input.blocId)) {
    return { ok: false, error: "Bloc does not belong to resolution." };
  }

  for (const b of resolutionBlocs ?? []) {
    const { error: delErr } = await auth.supabase
      .from("bloc_memberships")
      .delete()
      .eq("bloc_id", b.id)
      .eq("user_id", auth.user.id);
    if (delErr) return { ok: false, error: delErr.message };
  }

  const { error } = await auth.supabase.from("bloc_memberships").insert({
    bloc_id: input.blocId,
    user_id: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: { resolutionId: input.resolutionId, blocId: input.blocId } };
}

export async function recordClauseVoteOutcomesAction(input: {
  voteItemId: string;
  resolutionId: string;
  clauseIds: string[];
  passed: boolean;
  removeClauseTargetsOnFail?: boolean;
  procedureCode?: string | null;
}): Promise<ActionResult<{ recorded: number; removed: number }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only staff can record clause vote outcomes." };
  }
  if (!isUuid(input.voteItemId) || !isUuid(input.resolutionId)) {
    return { ok: false, error: "Invalid IDs." };
  }
  if (input.clauseIds.length === 0) return { ok: true, data: { recorded: 0, removed: 0 } };
  if (!input.clauseIds.every(isUuid)) return { ok: false, error: "Invalid clause ids." };

  const { data: validClauses, error: clauseReadErr } = await auth.supabase
    .from("resolution_clauses")
    .select("id")
    .eq("resolution_id", input.resolutionId)
    .in("id", input.clauseIds);
  if (clauseReadErr) return { ok: false, error: clauseReadErr.message };
  const validSet = new Set((validClauses ?? []).map((c) => c.id));
  if (validSet.size !== input.clauseIds.length) {
    return { ok: false, error: "Some clause ids do not belong to resolution." };
  }

  const { error: insErr } = await auth.supabase.from("resolution_clause_vote_outcomes").insert(
    input.clauseIds.map((clauseId) => ({
      vote_item_id: input.voteItemId,
      resolution_id: input.resolutionId,
      clause_id: clauseId,
      passed: input.passed,
    }))
  );
  if (insErr) return { ok: false, error: insErr.message };

  let removed = 0;
  if (
    !input.passed &&
    input.removeClauseTargetsOnFail &&
    (input.procedureCode === "divide_question" || input.procedureCode === "clause_by_clause")
  ) {
    const { error: delErr, count } = await auth.supabase
      .from("resolution_clauses")
      .delete({ count: "exact" })
      .eq("resolution_id", input.resolutionId)
      .in("id", input.clauseIds);
    if (delErr) return { ok: false, error: delErr.message };
    removed = count ?? 0;
  }

  return { ok: true, data: { recorded: input.clauseIds.length, removed } };
}

export async function listClauseOutcomesAction(input: {
  clauseIds: string[];
}): Promise<
  ActionResult<
    Array<{
      id: string;
      vote_item_id: string;
      resolution_id: string;
      clause_id: string;
      passed: boolean;
      applied_at: string;
    }>
  >
> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Not authenticated." };
  if (input.clauseIds.length === 0) return { ok: true, data: [] };
  if (!input.clauseIds.every(isUuid)) return { ok: false, error: "Invalid clause ids." };

  const { data, error } = await auth.supabase
    .from("resolution_clause_vote_outcomes")
    .select("id, vote_item_id, resolution_id, clause_id, passed, applied_at")
    .in("clause_id", input.clauseIds)
    .order("applied_at", { ascending: false })
    .limit(500);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

