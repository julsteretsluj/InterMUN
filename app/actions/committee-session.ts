// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import {
  getCommitteeAwardScope,
  resolveCanonicalCommitteeConferenceId,
} from "@/lib/conference-committee-canonical";
import type { SupabaseClient } from "@supabase/supabase-js";

function friendlyProcedureStateError(message: string): string {
  const m = message.trim();
  if (!m) return "Could not start the session. Please try again.";
  if (/schema cache/i.test(m) && /committee_session/i.test(m)) {
    return "Session controls need the latest database migrations applied on Supabase.";
  }
  if (/row-level security/i.test(m)) {
    return "You must be signed in as the committee chair to start a session.";
  }
  if (/JWT expired|Invalid Refresh Token|refresh_token/i.test(m)) {
    return "Your sign-in expired — refresh the page and try again.";
  }
  if (/foreign key constraint.*conference_id/i.test(m)) {
    return "This committee room is not configured correctly — re-enter the room code and try again.";
  }
  return m;
}

function sessionStartedAtMatches(a: string, b: string): boolean {
  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  return !Number.isNaN(aMs) && !Number.isNaN(bMs) && Math.abs(aMs - bMs) < 2000;
}

function normalizeSessionTitle(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t.length > 0 ? t : null;
}

/** Backfill when the DB trigger did not open a row (e.g. stale open history). Idempotent. */
async function ensureCommitteeSessionHistoryOpen(
  db: SupabaseClient,
  conferenceId: string,
  title: string,
  startedAt: string,
  createdBy: string
): Promise<{ error?: string }> {
  const { data: openRow, error: readErr } = await db
    .from("committee_session_history")
    .select("id, started_at, title")
    .eq("conference_id", conferenceId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) return { error: readErr.message };

  if (
    openRow &&
    sessionStartedAtMatches(openRow.started_at, startedAt) &&
    openRow.title.trim() === title.trim()
  ) {
    return {};
  }

  if (openRow) {
    const closedAt = new Date().toISOString();
    const { error: closeErr } = await db
      .from("committee_session_history")
      .update({ ended_at: closedAt, updated_at: closedAt })
      .eq("id", openRow.id);
    if (closeErr) return { error: closeErr.message };
  }

  const { error: insertErr } = await db.from("committee_session_history").insert({
    conference_id: conferenceId,
    title,
    started_at: startedAt,
    created_by: createdBy,
  });
  if (insertErr) return { error: insertErr.message };
  return {};
}

async function chairCanManageCommittee(
  supabase: SupabaseClient,
  userId: string,
  canonicalCommitteeId: string
): Promise<boolean> {
  const awardScope = await getCommitteeAwardScope(supabase, canonicalCommitteeId);
  const { data: chairSeat } = await supabase
    .from("allocations")
    .select("id")
    .in("conference_id", awardScope.siblingConferenceIds)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (chairSeat?.id) return true;

  const activeConf = await resolveDashboardConferenceForUser("chair", userId);
  if (!activeConf) return false;
  const activeScope = await getCommitteeAwardScope(supabase, activeConf.id);
  return activeScope.canonicalConferenceId === awardScope.canonicalConferenceId;
}

async function requireChairForCommittee(conferenceId: string): Promise<
  | { error: string }
  | {
      userId: string;
      canonicalId: string;
      db: SupabaseClient;
    }
> {
  const trimmed = conferenceId?.trim();
  if (!trimmed) return { error: "Missing committee." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();

  if (role !== "chair" && role !== "admin") {
    return { error: "Only chairs can manage a committee session." };
  }

  const canonicalId = await resolveCanonicalCommitteeConferenceId(supabase, trimmed);

  if (role === "chair") {
    const allowed = await chairCanManageCommittee(supabase, user.id, canonicalId);
    if (!allowed) {
      return {
        error:
          "Your chair account is not linked to this committee. Open the room gate for your committee first.",
      };
    }
  }

  const db = createAdminClient() ?? supabase;
  return { userId: user.id, canonicalId, db };
}

function revalidateCommitteeSessionSurfaces() {
  const paths = [
    "/chair/session",
    "/chair/session/roll-call",
    "/chair/session/agenda",
    "/chair/session/speakers",
    "/chair/session/motions",
    "/chair/session/timer",
    "/chair/session/announcements",
    "/chair/session/discipline",
    "/committee-room",
    "/chats-notes",
    "/delegate",
    "/profile",
    "/chair",
  ];
  for (const path of paths) {
    revalidatePath(path);
  }
}

async function upsertCommitteeSessionState(
  db: SupabaseClient,
  canonicalId: string,
  sessionPayload: Record<string, unknown>,
  insertDefaults?: Record<string, unknown>
): Promise<{ error?: string }> {
  const { data: existing, error: readErr } = await db
    .from("procedure_states")
    .select("conference_id")
    .eq("conference_id", canonicalId)
    .maybeSingle();

  if (readErr) {
    return { error: friendlyProcedureStateError(readErr.message) };
  }

  const writeResult = existing
    ? await db.from("procedure_states").update(sessionPayload).eq("conference_id", canonicalId)
    : await db.from("procedure_states").insert({
        conference_id: canonicalId,
        state: "debate_open",
        debate_closed: false,
        motion_floor_open: false,
        ...insertDefaults,
        ...sessionPayload,
      });

  if (writeResult.error) {
    return { error: friendlyProcedureStateError(writeResult.error.message) };
  }
  return {};
}

/** Start or restart the committee session on the canonical chamber row. */
export async function startCommitteeSessionAction(input: {
  conferenceId: string;
  title?: string | null;
  durationSeconds?: number | null;
  endsAt?: string | null;
}): Promise<{ error?: string; success?: boolean; canonicalConferenceId?: string }> {
  const auth = await requireChairForCommittee(input.conferenceId);
  if ("error" in auth) return { error: auth.error };

  const { userId, canonicalId, db } = auth;
  const now = new Date().toISOString();
  const title = normalizeSessionTitle(input.title);
  const durationSeconds =
    input.durationSeconds != null && input.durationSeconds > 0
      ? Math.floor(input.durationSeconds)
      : null;
  const endsAt = input.endsAt?.trim() ? input.endsAt.trim() : null;

  if (endsAt) {
    const endMs = new Date(endsAt).getTime();
    if (!Number.isNaN(endMs) && endMs <= Date.now()) {
      return { error: "End time must be in the future." };
    }
  }

  const sessionPayload = {
    committee_session_started_at: now,
    committee_session_title: title,
    committee_session_duration_seconds: durationSeconds,
    committee_session_ends_at: endsAt,
    updated_at: now,
  };

  const writeResult = await upsertCommitteeSessionState(db, canonicalId, sessionPayload);
  if (writeResult.error) return writeResult;

  const historyTitle =
    title ??
    `Session ${new Date(now).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;

  const historyResult = await ensureCommitteeSessionHistoryOpen(
    db,
    canonicalId,
    historyTitle,
    now,
    userId
  );
  if (historyResult.error) {
    return { error: friendlyProcedureStateError(historyResult.error) };
  }

  revalidateCommitteeSessionSurfaces();
  return { success: true, canonicalConferenceId: canonicalId };
}

/** Stop the committee session timer and close the open history row (via DB trigger). */
export async function stopCommitteeSessionAction(input: {
  conferenceId: string;
}): Promise<{ error?: string; success?: boolean; canonicalConferenceId?: string }> {
  const auth = await requireChairForCommittee(input.conferenceId);
  if ("error" in auth) return { error: auth.error };

  const { canonicalId, db } = auth;
  const now = new Date().toISOString();
  const sessionPayload = {
    committee_session_started_at: null,
    committee_session_title: null,
    committee_session_duration_seconds: null,
    committee_session_ends_at: null,
    updated_at: now,
  };

  const writeResult = await upsertCommitteeSessionState(db, canonicalId, sessionPayload);
  if (writeResult.error) return writeResult;

  revalidateCommitteeSessionSurfaces();
  return { success: true, canonicalConferenceId: canonicalId };
}

/** Update duration/end limit while a session is already running. */
export async function updateCommitteeSessionLimitAction(input: {
  conferenceId: string;
  durationSeconds?: number | null;
  endsAt?: string | null;
}): Promise<{ error?: string; success?: boolean; canonicalConferenceId?: string }> {
  const auth = await requireChairForCommittee(input.conferenceId);
  if ("error" in auth) return { error: auth.error };

  const { canonicalId, db } = auth;
  const durationSeconds =
    input.durationSeconds != null && input.durationSeconds > 0
      ? Math.floor(input.durationSeconds)
      : null;
  const endsAt = input.endsAt?.trim() ? input.endsAt.trim() : null;

  if (endsAt) {
    const endMs = new Date(endsAt).getTime();
    if (!Number.isNaN(endMs) && endMs <= Date.now()) {
      return { error: "End time must be in the future, or choose no limit." };
    }
  }

  const now = new Date().toISOString();
  const { error } = await db
    .from("procedure_states")
    .update({
      committee_session_duration_seconds: durationSeconds,
      committee_session_ends_at: endsAt,
      updated_at: now,
    })
    .eq("conference_id", canonicalId);

  if (error) {
    return { error: friendlyProcedureStateError(error.message) };
  }

  revalidateCommitteeSessionSurfaces();
  return { success: true, canonicalConferenceId: canonicalId };
}

/** Start or restart the committee session timer from a scheduled preset. */
export async function startScheduledCommitteeSessionAction(input: {
  conferenceId: string;
  title: string;
  durationSeconds: number;
}): Promise<{ error?: string; success?: boolean; canonicalConferenceId?: string }> {
  const title = input.title?.trim();
  if (!title) return { error: "Missing session title." };

  return startCommitteeSessionAction({
    conferenceId: input.conferenceId,
    title,
    durationSeconds: Math.max(60, Math.floor(Number(input.durationSeconds) || 0)),
    endsAt: null,
  });
}
