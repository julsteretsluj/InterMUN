import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveConferenceId, clearActiveConference } from "@/lib/active-conference-cookie";
import { getActiveEventId, clearActiveEvent } from "@/lib/active-event-cookie";
import { allowImplicitLatestConference } from "@/lib/roles";
import { resolveCanonicalCommitteeConferenceId } from "@/lib/conference-committee-canonical";
import { getSmtDashboardSurface, type SmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";

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

const ACTIVE_CONFERENCE_SELECT =
  "id, event_id, name, committee, tagline, committee_password_hash, room_code, committee_code, crisis_slides_url, allocation_code_gate_enabled, procedure_profile, eu_guided_workflow_enabled";

/**
 * SMT users on chair/delegate surfaces: resolve committee from profile bindings (active event).
 */
async function getConferenceForSmtCommitteeSurface(options: {
  userId: string;
  surface: Exclude<SmtDashboardSurface, "secretariat">;
}): Promise<ActiveConferenceRow | null> {
  const supabase = await createClient();
  const eventId = await getActiveEventId();
  if (!eventId) return null;

  if (options.surface === "chair") {
    const { data: prof } = await supabase
      .from("profiles")
      .select("smt_chair_conference_id")
      .eq("id", options.userId)
      .maybeSingle();
    const cid = (prof as { smt_chair_conference_id?: string | null } | null)?.smt_chair_conference_id?.trim();
    if (!cid) return null;
    const { data: conf } = await supabase
      .from("conferences")
      .select(ACTIVE_CONFERENCE_SELECT)
      .eq("id", cid)
      .maybeSingle();
    const row = asActiveConferenceRow(conf);
    if (!row || row.event_id !== eventId) return null;
    return row;
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("smt_delegate_allocation_id")
    .eq("id", options.userId)
    .maybeSingle();
  const aid = (prof as { smt_delegate_allocation_id?: string | null } | null)?.smt_delegate_allocation_id?.trim();
  if (!aid) return null;
  const { data: alloc } = await supabase
    .from("allocations")
    .select("conference_id, user_id")
    .eq("id", aid)
    .maybeSingle();
  if (!alloc?.conference_id || alloc.user_id !== options.userId) return null;
  const { data: conf } = await supabase
    .from("conferences")
    .select(ACTIVE_CONFERENCE_SELECT)
    .eq("id", alloc.conference_id)
    .maybeSingle();
  const row = asActiveConferenceRow(conf);
  if (!row || row.event_id !== eventId) return null;
  return row;
}

/**
 * Conference context for the dashboard:
 * 1) Room code cookie (explicit committee)
 * 2) Chairs / SMT → latest conference row (multi-committee ops)
 * 3) Everyone when exactly one conference exists → that row (no room code needed)
 */
export async function getConferenceForDashboard(options: {
  role: string | null | undefined;
  userId?: string | null;
  smtDashboardSurface?: SmtDashboardSurface | null;
}): Promise<ActiveConferenceRow | null> {
  const roleLower = options.role?.toString().trim().toLowerCase();
  const surface = options.smtDashboardSurface ?? null;
  if (
    roleLower === "smt" &&
    options.userId &&
    (surface === "chair" || surface === "delegate")
  ) {
    const bound = await getConferenceForSmtCommitteeSurface({
      userId: options.userId,
      surface,
    });
    if (bound) return bound;
  }

  const fromCookie = await getResolvedActiveConference();
  if (fromCookie) return fromCookie;

  const supabase = await createClient();

  const { count, error: countErr } = await supabase
    .from("conferences")
    .select("*", { count: "exact", head: true });
  const total = countErr ? 0 : count ?? 0;

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
      const canonicalIds = [
        ...new Set(
          await Promise.all(
            distinctIds.map((id) => resolveCanonicalCommitteeConferenceId(supabase, id))
          )
        ),
      ];
      if (canonicalIds.length === 1) {
        const { data: conf } = await supabase
          .from("conferences")
          .select(
            `${ACTIVE_CONFERENCE_SELECT}, consultation_before_moderated_caucus`
          )
          .eq("id", canonicalIds[0])
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
    .select(`${ACTIVE_CONFERENCE_SELECT}, consultation_before_moderated_caucus`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return asActiveConferenceRow(data);
}

/** Same as {@link getConferenceForDashboard} with SMT surface + user id applied when role is SMT. */
export async function resolveDashboardConferenceForUser(
  profileRole: string | null | undefined,
  userId: string
): Promise<ActiveConferenceRow | null> {
  const smtSurface =
    profileRole?.toString().trim().toLowerCase() === "smt"
      ? await getSmtDashboardSurface()
      : null;
  return getConferenceForDashboard({
    role: profileRole,
    userId,
    smtDashboardSurface: smtSurface,
  });
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

  const conf = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!conf) {
    redirect("/room-gate");
  }
  return conf.id;
}
