import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveConferenceId, clearActiveConference } from "@/lib/active-conference-cookie";
import { getActiveEventId, clearActiveEvent } from "@/lib/active-event-cookie";
import { allowImplicitLatestConference } from "@/lib/roles";

export type ActiveConferenceRow = {
  id: string;
  event_id: string;
  name: string;
  committee: string | null;
  tagline: string | null;
  committee_password_hash: string | null;
  room_code: string | null;
  committee_code: string | null;
  crisis_slides_url: string | null;
  allocation_code_gate_enabled: boolean;
};

/** Active committee from room code (cookie). Validates row still exists. */
export async function getResolvedActiveConference(): Promise<ActiveConferenceRow | null> {
  const id = await getActiveConferenceId();
  if (!id) return null;

  const eventId = await getActiveEventId();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conferences")
    .select(
      "id, event_id, name, committee, tagline, committee_password_hash, room_code, committee_code, crisis_slides_url, allocation_code_gate_enabled"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    await clearActiveConference();
    return null;
  }

  if (!eventId) {
    await clearActiveConference();
    return null;
  }

  if (data.event_id !== eventId) {
    await clearActiveConference();
    await clearActiveEvent();
    return null;
  }

  return data as ActiveConferenceRow;
}

/**
 * Conference context for the dashboard:
 * 1) Room code cookie (explicit committee)
 * 2) Chairs / SMT → latest conference row (multi-committee ops)
 * 3) Everyone when exactly one conference exists → that row (no room code needed)
 */
export async function getConferenceForDashboard(options: {
  role: string | null | undefined;
}): Promise<ActiveConferenceRow | null> {
  const fromCookie = await getResolvedActiveConference();
  if (fromCookie) return fromCookie;

  const supabase = await createClient();

  const { count, error: countErr } = await supabase
    .from("conferences")
    .select("*", { count: "exact", head: true });
  const total = countErr ? 0 : count ?? 0;

  const useImplicitLatest =
    allowImplicitLatestConference(options.role) || total === 1;
  if (!useImplicitLatest) return null;

  const { data } = await supabase
    .from("conferences")
    .select(
      "id, event_id, name, committee, tagline, committee_password_hash, room_code, committee_code, crisis_slides_url, allocation_code_gate_enabled"
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ActiveConferenceRow) ?? null;
}

export async function requireActiveConferenceId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const conf = await getConferenceForDashboard({ role: profile?.role });
  if (!conf) {
    redirect("/room-gate");
  }
  return conf.id;
}
