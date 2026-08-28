// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextClauseNumber, resolutionSmtForwardGaps, isResolutionReadyToForwardToSmt } from "@/lib/resolution-functions";
import { isGoogleDocsDocumentUrl } from "@/lib/google-docs-embed";
import {
  extractOperativeClauses,
  fetchGoogleDocText,
  GoogleDocNotPublicError,
} from "@/lib/resolution-doc-clauses";
import { getChamberScope } from "@/lib/chamber-scope";
import { fetchScorableDelegatesForCommittee } from "@/lib/seated-delegates-for-awards";
import nodemailer from "nodemailer";

type BlocStance = "for" | "against" | "neutral";

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
  const { count, error: countErr } = await auth.supabase
    .from("resolutions")
    .select("id", { count: "exact", head: true })
    .eq("conference_id", input.conferenceId);
  if (countErr) return { ok: false, error: countErr.message };
  if ((count ?? 0) >= 3) {
    return { ok: false, error: "Maximum of 3 draft resolutions per committee." };
  }

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

  // Resolve the committee (conference) this bloc belongs to.
  const { data: targetRes, error: resErr } = await auth.supabase
    .from("resolutions")
    .select("id, conference_id")
    .eq("id", input.resolutionId)
    .maybeSingle();
  if (resErr) return { ok: false, error: resErr.message };
  if (!targetRes?.conference_id) return { ok: false, error: "Resolution not found." };

  // Every bloc across every resolution in this committee.
  const { data: committeeResolutions, error: listErr } = await auth.supabase
    .from("resolutions")
    .select("id, blocs(id)")
    .eq("conference_id", targetRes.conference_id);
  if (listErr) return { ok: false, error: listErr.message };

  const committeeBlocIds = new Set<string>();
  for (const r of committeeResolutions ?? []) {
    for (const b of (r as { blocs?: { id: string }[] }).blocs ?? []) {
      committeeBlocIds.add(b.id);
    }
  }
  if (!committeeBlocIds.has(input.blocId)) {
    return { ok: false, error: "Bloc does not belong to this committee." };
  }

  // A delegate can be in exactly one bloc per committee.
  if (committeeBlocIds.size > 0) {
    const { error: delErr } = await auth.supabase
      .from("bloc_memberships")
      .delete()
      .in("bloc_id", Array.from(committeeBlocIds))
      .eq("user_id", auth.user.id);
    if (delErr) return { ok: false, error: delErr.message };
  }

  const { error } = await auth.supabase.from("bloc_memberships").insert({
    bloc_id: input.blocId,
    user_id: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/resolutions");
  return { ok: true, data: { resolutionId: input.resolutionId, blocId: input.blocId } };
}

/**
 * Chairs/staff configure the committee's blocs. Each bloc is its own
 * resolution draft (1 bloc row per resolution row). Blocs with an id are
 * updated in place; those without are created; existing blocs omitted from
 * the list are deleted (cascading their resolution + clauses).
 */
export async function setCommitteeBlocsAction(input: {
  conferenceId: string;
  blocs: Array<{ id?: string; name: string; stance: BlocStance }>;
}): Promise<ActionResult<{ count: number }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only chairs can configure blocs." };
  }
  if (!isUuid(input.conferenceId)) return { ok: false, error: "Invalid conference id." };

  const validStances: BlocStance[] = ["for", "against", "neutral"];
  const desired = input.blocs
    .map((b) => ({ id: b.id?.trim() || undefined, name: b.name.trim(), stance: b.stance }))
    .filter((b) => b.name.length > 0 && validStances.includes(b.stance));

  // Existing blocs in this committee (bloc -> resolution).
  const { data: existingResolutions, error: exErr } = await auth.supabase
    .from("resolutions")
    .select("id, blocs(id)")
    .eq("conference_id", input.conferenceId);
  if (exErr) return { ok: false, error: exErr.message };

  const blocToResolution = new Map<string, string>();
  for (const r of existingResolutions ?? []) {
    for (const b of (r as { id: string; blocs?: { id: string }[] }).blocs ?? []) {
      blocToResolution.set(b.id, (r as { id: string }).id);
    }
  }

  const keepBlocIds = new Set<string>();

  for (const bloc of desired) {
    if (bloc.id && blocToResolution.has(bloc.id)) {
      keepBlocIds.add(bloc.id);
      const { error: updErr } = await auth.supabase
        .from("blocs")
        .update({ name: bloc.name, stance: bloc.stance })
        .eq("id", bloc.id);
      if (updErr) return { ok: false, error: updErr.message };
    } else {
      const { data: createdRes, error: resInsErr } = await auth.supabase
        .from("resolutions")
        .insert({
          conference_id: input.conferenceId,
          main_submitters: [],
          co_submitters: [],
          signatories: [],
        })
        .select("id")
        .single();
      if (resInsErr || !createdRes?.id) {
        return { ok: false, error: resInsErr?.message ?? "Failed to create bloc." };
      }
      const { error: blocInsErr } = await auth.supabase
        .from("blocs")
        .insert({ resolution_id: createdRes.id, name: bloc.name, stance: bloc.stance });
      if (blocInsErr) return { ok: false, error: blocInsErr.message };
    }
  }

  // Delete resolutions whose bloc was removed from the desired list.
  const removeResolutionIds = new Set<string>();
  for (const [blocId, resolutionId] of blocToResolution.entries()) {
    if (!keepBlocIds.has(blocId)) removeResolutionIds.add(resolutionId);
  }
  if (removeResolutionIds.size > 0) {
    const { error: delErr } = await auth.supabase
      .from("resolutions")
      .delete()
      .in("id", Array.from(removeResolutionIds));
    if (delErr) return { ok: false, error: delErr.message };
  }

  revalidatePath("/resolutions");
  return { ok: true, data: { count: desired.length } };
}

/** Bloc member (or staff) sets the single Google Doc link for their bloc's resolution. */
export async function setResolutionDocLinkAction(input: {
  resolutionId: string;
  url: string;
}): Promise<ActionResult<{ resolutionId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Not authenticated." };
  if (!isUuid(input.resolutionId)) return { ok: false, error: "Invalid resolution id." };

  const url = input.url.trim();
  if (!url) return { ok: false, error: "A Google Docs link is required." };
  if (!isGoogleDocsDocumentUrl(url)) {
    return { ok: false, error: "Enter a valid Google Docs link." };
  }

  const { error } = await auth.supabase
    .from("resolutions")
    .update({ google_docs_url: url, updated_at: new Date().toISOString() })
    .eq("id", input.resolutionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/resolutions");
  return { ok: true, data: { resolutionId: input.resolutionId } };
}

export type ResolutionSponsorRole = "main" | "co" | "signatory";

function uniqueUuids(ids: string[]): string[] {
  return Array.from(new Set(ids.map((s) => s.trim()).filter(isUuid)));
}

/** Add or remove a main submitter, co-submitter, or signatory on a bloc draft. */
export async function updateResolutionSponsorsAction(input: {
  resolutionId: string;
  role: ResolutionSponsorRole;
  action: "add" | "remove";
  userId: string;
}): Promise<ActionResult<{ resolutionId: string }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Not authenticated." };
  if (!isUuid(input.resolutionId) || !isUuid(input.userId)) {
    return { ok: false, error: "Invalid IDs." };
  }
  if (input.role !== "main" && input.role !== "co" && input.role !== "signatory") {
    return { ok: false, error: "Invalid sponsor role." };
  }

  const { data: resolution, error: readErr } = await auth.supabase
    .from("resolutions")
    .select("id, conference_id, status, main_submitters, co_submitters, signatories")
    .eq("id", input.resolutionId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!resolution) return { ok: false, error: "Resolution not found." };
  if ((resolution.status ?? "draft") === "finalized") {
    return { ok: false, error: "This resolution is finalized." };
  }

  const { data: bloc } = await auth.supabase
    .from("blocs")
    .select("id")
    .eq("resolution_id", input.resolutionId)
    .maybeSingle();
  let isMember = false;
  if (bloc?.id) {
    const { data: membership } = await auth.supabase
      .from("bloc_memberships")
      .select("id")
      .eq("bloc_id", bloc.id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    isMember = Boolean(membership?.id);
  }

  const selfSign =
    input.action === "add" &&
    input.role === "signatory" &&
    input.userId === auth.user.id &&
    auth.role === "delegate";
  if (!isStaff(auth.role) && !isMember && !selfSign) {
    return { ok: false, error: "You cannot edit sponsors on this draft." };
  }

  const main = uniqueUuids((resolution.main_submitters as string[] | null) ?? []);
  const co = uniqueUuids((resolution.co_submitters as string[] | null) ?? []);
  const signatories = uniqueUuids((resolution.signatories as string[] | null) ?? []);
  const without = (ids: string[]) => ids.filter((id) => id !== input.userId);
  let nextMain = without(main);
  let nextCo = without(co);
  let nextSign = without(signatories);
  if (input.action === "add") {
    if (input.role === "main") nextMain = uniqueUuids([...nextMain, input.userId]);
    if (input.role === "co") nextCo = uniqueUuids([...nextCo, input.userId]);
    if (input.role === "signatory") nextSign = uniqueUuids([...nextSign, input.userId]);
  }

  const db = createAdminClient() ?? auth.supabase;
  const { error } = await db
    .from("resolutions")
    .update({
      main_submitters: nextMain,
      co_submitters: nextCo,
      signatories: nextSign,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.resolutionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/resolutions");
  return { ok: true, data: { resolutionId: input.resolutionId } };
}

/**
 * Finalize a bloc's resolution: fetch the public Google Doc, extract operative
 * clauses, persist them, flip status to finalized, and notify chairs (via RPC).
 */
export async function finalizeResolutionAction(input: {
  resolutionId: string;
}): Promise<ActionResult<{ resolutionId: string; clauseCount: number }>> {
  const auth = await getAuthContext();
  if (!auth.user) return { ok: false, error: "Not authenticated." };
  if (!isUuid(input.resolutionId)) return { ok: false, error: "Invalid resolution id." };

  const { data: resolution, error: readErr } = await auth.supabase
    .from("resolutions")
    .select("id, google_docs_url, status")
    .eq("id", input.resolutionId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!resolution) return { ok: false, error: "Resolution not found." };
  if ((resolution as { status?: string }).status === "finalized") {
    return { ok: false, error: "This resolution is already finalized." };
  }
  if (!resolution.google_docs_url?.trim()) {
    return { ok: false, error: "Add a Google Docs link before finalizing." };
  }

  let clauses: string[];
  try {
    const text = await fetchGoogleDocText(resolution.google_docs_url);
    clauses = extractOperativeClauses(text);
  } catch (e) {
    if (e instanceof GoogleDocNotPublicError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Could not read the Google Doc." };
  }

  if (clauses.length === 0) {
    return {
      ok: false,
      error: "No numbered operative clauses were found in the doc. Number your clauses (1., 2., ...) and try again.",
    };
  }

  const { error: rpcErr } = await auth.supabase.rpc("finalize_resolution_with_clauses", {
    p_resolution_id: input.resolutionId,
    p_clauses: clauses,
  });
  if (rpcErr) return { ok: false, error: rpcErr.message };

  revalidatePath("/resolutions");
  revalidatePath("/amendments");
  return { ok: true, data: { resolutionId: input.resolutionId, clauseCount: clauses.length } };
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

export async function emailResolutionToDelegateAction(input: {
  conferenceId: string;
  resolutionId: string;
  targetEmail: string;
}): Promise<ActionResult<{ resolutionId: string; targetEmail: string }>> {
  const auth = await getAuthContext();
  if (!auth.user || (auth.role !== "delegate" && !isStaff(auth.role))) {
    return { ok: false, error: "Only delegates or staff can send resolutions by email." };
  }
  if (!isUuid(input.conferenceId) || !isUuid(input.resolutionId)) {
    return { ok: false, error: "Invalid IDs." };
  }

  const to = input.targetEmail.trim().toLowerCase();
  if (!to || !to.includes("@") || to.includes(" ")) {
    return { ok: false, error: "Enter a valid delegate email." };
  }

  const { data: resolution, error: resolutionErr } = await auth.supabase
    .from("resolutions")
    .select("id, conference_id, google_docs_url")
    .eq("id", input.resolutionId)
    .eq("conference_id", input.conferenceId)
    .maybeSingle();
  if (resolutionErr || !resolution) {
    return { ok: false, error: resolutionErr?.message ?? "Resolution not found in this committee." };
  }

  const { data: conf } = await auth.supabase
    .from("conferences")
    .select("name, committee")
    .eq("id", input.conferenceId)
    .maybeSingle();
  const committeeLabel = [conf?.name, conf?.committee].filter(Boolean).join(" — ") || "InterMUN committee";

  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    if (!host || !user || !pass || !from) {
      return {
        ok: false,
        error: "Email server is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.",
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = `InterMUN resolution share (${committeeLabel})`;
    const text = [
      "A resolution was shared with you in InterMUN.",
      "",
      `Committee: ${committeeLabel}`,
      `Resolution ID: ${resolution.id}`,
      resolution.google_docs_url?.trim()
        ? `Google Doc: ${resolution.google_docs_url.trim()}`
        : "Google Doc: (not linked)",
      "",
      "Open InterMUN -> Resolutions for full context and bloc details.",
    ].join("\n");

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not send resolution email.",
    };
  }

  return { ok: true, data: { resolutionId: input.resolutionId, targetEmail: to } };
}

/**
 * Chair forwards every complete finalized resolution in this chamber to secretariat
 * for Best Resolution review. Incomplete drafts stay with the dais.
 */
export async function forwardCompleteResolutionsToSmtAction(input: {
  conferenceId: string;
}): Promise<ActionResult<{ forwarded: number; alreadyForwarded: number; incomplete: number }>> {
  const auth = await getAuthContext();
  if (!auth.user || !isStaff(auth.role)) {
    return { ok: false, error: "Only chairs can forward resolutions to secretariat." };
  }
  if (!isUuid(input.conferenceId)) return { ok: false, error: "Invalid conference id." };

  const scope = await getChamberScope(auth.supabase, input.conferenceId);
  const siblingIds = scope.siblingConferenceIds;
  const seated = await fetchScorableDelegatesForCommittee(auth.supabase, siblingIds);
  const seatedCount = seated.length;

  const { data: rows, error: readErr } = await auth.supabase
    .from("resolutions")
    .select(
      "id, conference_id, google_docs_url, main_submitters, co_submitters, signatories, status, forwarded_to_smt_at"
    )
    .in("conference_id", siblingIds);
  if (readErr) return { ok: false, error: readErr.message };

  const resolutions = rows ?? [];
  const ids = resolutions.map((r) => r.id);
  const clauseCountById = new Map<string, number>();
  if (ids.length > 0) {
    const { data: clauseRows, error: clauseErr } = await auth.supabase
      .from("resolution_clauses")
      .select("id, resolution_id")
      .in("resolution_id", ids);
    if (clauseErr) return { ok: false, error: clauseErr.message };
    for (const row of clauseRows ?? []) {
      clauseCountById.set(row.resolution_id, (clauseCountById.get(row.resolution_id) ?? 0) + 1);
    }
  }

  const readyIds: string[] = [];
  let alreadyForwarded = 0;
  let incomplete = 0;
  for (const r of resolutions) {
    if (r.forwarded_to_smt_at) {
      alreadyForwarded += 1;
      continue;
    }
    const gaps = resolutionSmtForwardGaps({
      status: r.status,
      googleDocsUrl: r.google_docs_url,
      clauseCount: clauseCountById.get(r.id) ?? 0,
      mainSubmitterCount: (r.main_submitters ?? []).filter(Boolean).length,
      coSubmitterCount: (r.co_submitters ?? []).filter(Boolean).length,
      signatoryCount: (r.signatories ?? []).filter(Boolean).length,
      seatedCount,
    });
    if (!isResolutionReadyToForwardToSmt(gaps)) {
      incomplete += 1;
      continue;
    }
    readyIds.push(r.id);
  }

  if (readyIds.length === 0) {
    return {
      ok: false,
      error:
        alreadyForwarded > 0 && incomplete === 0
          ? "All complete resolutions are already with secretariat."
          : "No complete resolutions to forward. Finalize drafts with a Google Doc, numbered clauses, and full submitter lists first.",
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await auth.supabase
    .from("resolutions")
    .update({
      forwarded_to_smt_at: nowIso,
      forwarded_to_smt_by: auth.user.id,
      updated_at: nowIso,
    })
    .in("id", readyIds);
  if (updErr) return { ok: false, error: updErr.message };

  const admin = createAdminClient();
  if (admin) {
    const { data: smtProfiles } = await admin
      .from("profiles")
      .select("id")
      .in("role", ["smt", "admin"]);
    const smtIds = (smtProfiles ?? []).map((p) => p.id).filter((id) => id !== auth.user!.id);
    if (smtIds.length > 0) {
      const committeeId = scope.canonicalConferenceId;
      await admin.from("user_notifications").insert(
        smtIds.map((userId) => ({
          user_id: userId,
          conference_id: committeeId,
          type: "resolutions_forwarded_smt",
          title: "Resolutions ready for Best Resolution review",
          body: `${readyIds.length} complete resolution(s) were forwarded by chairs.`,
          href: "/smt/awards",
          reference_id: readyIds[0],
        }))
      );
    }
  }

  revalidatePath("/resolutions");
  revalidatePath("/smt/awards");
  return {
    ok: true,
    data: { forwarded: readyIds.length, alreadyForwarded, incomplete },
  };
}

