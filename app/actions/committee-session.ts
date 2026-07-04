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

/** Start or restart the committee session timer from a scheduled preset. */
export async function startScheduledCommitteeSessionAction(input: {
  conferenceId: string;
  title: string;
  durationSeconds: number;
}): Promise<{ error?: string; success?: boolean }> {
  const conferenceId = input.conferenceId?.trim();
  const title = input.title?.trim();
  const durationSeconds = Math.max(60, Math.floor(Number(input.durationSeconds) || 0));

  if (!conferenceId) return { error: "Missing committee." };
  if (!title) return { error: "Missing session title." };

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
    return { error: "Only chairs can start a committee session." };
  }

  const canonicalId = await resolveCanonicalCommitteeConferenceId(supabase, conferenceId);

  if (role === "chair") {
    const allowed = await chairCanManageCommittee(supabase, user.id, canonicalId);
    if (!allowed) {
      return {
        error: "Your chair account is not linked to this committee. Open the room gate for your committee first.",
      };
    }
  }

  const now = new Date().toISOString();
  const sessionPayload = {
    committee_session_started_at: now,
    committee_session_title: title,
    committee_session_duration_seconds: durationSeconds,
    committee_session_ends_at: null,
    updated_at: now,
  };

  const db = createAdminClient() ?? supabase;

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
        ...sessionPayload,
      });

  if (writeResult.error) {
    return { error: friendlyProcedureStateError(writeResult.error.message) };
  }

  revalidatePath("/chair/session");
  return { success: true };
}
