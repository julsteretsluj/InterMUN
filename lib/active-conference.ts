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
  consultation_before_moderated_caucus?: boolean;
  procedure_profile?: "default" | "eu_parliament";
  eu_guided_workflow_enabled?: boolean;
};

function asActiveConferenceRow(value: unknown): ActiveConferenceRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  if (typeof row.event_id !== "string") return null;
  if (typeof row.name !== "string") return null;
  return value as ActiveConferenceRow;
}

/** Active committee from room code (cookie). Validates row still exists. */
export async function getResolvedActiveConference(): Promise<ActiveConferenceRow | null> {
  const id = await getActiveConferenceId();
  if (!id) return null;

  const eventId = await getActiveEventId();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conferences")
    .select(
      "id, event_id, name, committee, tagline, committee_password_hash, room_code, committee_code, crisis_slides_url, allocation_code_gate_enabled, procedure_profile, eu_guided_workflow_enabled"
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

  return asActiveConferenceRow(data);
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

  const roleLower = options.role?.toString().trim().toLowerCase();

  /**
   * Chairs without a room-code cookie used to get `null` whenever more than one committee row
   * existed globally, even if they were only allocated to a single committee — saves looked
   * successful but refresh loaded an empty page (wrong/missing context).
   */
  if (roleLower === "chair" && total > 1) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: allocRows } = await supabase.from("allocations").select("conference_id").eq("user_id", user.id);
      const distinctIds = [
        ...new Set((allocRows ?? []).map((r) => r.conference_id).filter(Boolean)),
      ] as string[];
      if (distinctIds.length === 1) {
        const { data: conf } = await supabase
          .from("conferences")
          .select(
            "id, event_id, name, committee, tagline, committee_password_hash, room_code, committee_code, crisis_slides_url, allocation_code_gate_enabled, consultation_before_moderated_caucus"
            + ", procedure_profile, eu_guided_workflow_enabled"
          )
          .eq("id", distinctIds[0])
          .maybeSingle();
        const confRow = asActiveConferenceRow(conf);
        if (confRow) return confRow;
      }
    }
  }

  const useImplicitLatest =
    allowImplicitLatestConference(options.role) || total === 1;
  if (!useImplicitLatest) return null;

  const { data } = await supabase
    .from("conferences")
    .select(
      "id, event_id, name, committee, tagline, committee_password_hash, room_code, committee_code, crisis_slides_url, allocation_code_gate_enabled, consultation_before_moderated_caucus"
      + ", procedure_profile, eu_guided_workflow_enabled"
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return asActiveConferenceRow(data);
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
