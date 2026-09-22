import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { RoomCodeChairForm } from "./RoomCodeChairForm";
import { canChairSwitchAnyCommitteeForTesting } from "@/lib/testing-overrides";
import { getTranslations } from "next-intl/server";
import { isAdminRole, isSmtRole } from "@/lib/roles";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getActiveEventId } from "@/lib/active-event-cookie";
import {
  getCommitteeAwardScope,
} from "@/lib/conference-committee-canonical";
import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import {
  filterConferencesForSmtRoomCodes,
  isSmtSecretariatConferenceRow,
} from "@/lib/smt-conference-filters";
import { compareCommitteeRowsByDifficultyThenLabel } from "@/lib/committee-difficulty-sort";

type ConfRow = {
  id: string;
  name: string;
  committee: string | null;
  room_code: string | null;
  committee_code: string | null;
  event_id?: string | null;
};

function sharedCodeAmong(rows: ConfRow[]): string | null {
  for (const r of rows) {
    const code = (r.committee_code ?? r.room_code ?? "").trim();
    if (code) return code;
  }
  return null;
}

/** One form option per chamber; display code from any sibling that has it. */
function collapseToChamberOptions(rows: ConfRow[]): ConfRow[] {
  const map = new Map<string, ConfRow[]>();
  for (const c of rows) {
    const g = committeeSessionGroupKey(c.committee);
    const key = g ?? `__single:${c.id}`;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }

  const out: ConfRow[] = [];
  for (const group of map.values()) {
    const sorted = group
      .slice()
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
    const withCode = sorted.find((c) => (c.committee_code ?? c.room_code ?? "").trim());
    const primary = withCode ?? sorted[0]!;
    const code = sharedCodeAmong(sorted);
    out.push({
      ...primary,
      committee_code: code,
      room_code: code,
    });
  }

  return out.sort((a, b) => compareCommitteeRowsByDifficultyThenLabel(a, b));
}

export default async function ChairRoomCodePage() {
  const t = await getTranslations("pageTitles");
  const tRoom = await getTranslations("chairRoomCodePage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    redirect("/profile");
  }

  const smtSurface = isSmtRole(role) ? await getSmtDashboardSurface() : null;
  const effectiveRole = effectiveDashboardRole(role, smtSurface) ?? role;

  // Secretariat SMT should use the dedicated multi-chamber room-codes tool.
  if (isSmtRole(role) && smtSurface === "secretariat") {
    redirect("/smt/room-codes");
  }

  const bypassSeatRestriction = canChairSwitchAnyCommitteeForTesting(user.email);
  const eventId = await getActiveEventId();

  // SMT chair preview: bound chamber only (not seat filter — SMT has no chair seats).
  if (isSmtRole(role) && smtSurface === "chair") {
    const bound = await resolveDashboardConferenceForUser(role, user.id);
    if (!bound) {
      return (
        <MunPageShell title={t("committeeCodes")} variant="default">
          <p className="text-sm text-brand-muted mb-4 max-w-xl">{tRoom("noSmtChairBinding")}</p>
          <Link
            href="/smt/profile?smtBind=1"
            className="inline-flex rounded-[980px] bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
          >
            {tRoom("setChairBinding")}
          </Link>
        </MunPageShell>
      );
    }

    const scope = await getCommitteeAwardScope(supabase, bound.id);
    const { data: siblingRows } = await supabase
      .from("conferences")
      .select("id, name, committee, room_code, committee_code")
      .in("id", scope.siblingConferenceIds);

    const siblings = (siblingRows ?? []) as ConfRow[];
    const code = sharedCodeAmong(siblings);
    const canonical =
      siblings.find((c) => c.id === scope.canonicalConferenceId) ?? siblings[0] ?? null;
    const conferences: ConfRow[] = canonical
      ? [
          {
            ...canonical,
            id: scope.canonicalConferenceId,
            committee_code: code,
            room_code: code,
          },
        ]
      : [];

    return (
      <MunPageShell title={t("committeeCodes")} variant="offset">
        <p className="text-sm text-brand-muted mb-6 max-w-xl">
          {tRoom("intro")} {tRoom("smtChairScope")}
        </p>
        <RoomCodeChairForm conferences={conferences} />
      </MunPageShell>
    );
  }

  let conferencesQuery = supabase
    .from("conferences")
    .select("id, name, committee, room_code, committee_code, event_id")
    .order("created_at", { ascending: false });

  if (eventId) {
    conferencesQuery = conferencesQuery.eq("event_id", eventId);
  }

  if (role === "chair" && !bypassSeatRestriction) {
    const { data: seats } = await supabase
      .from("allocations")
      .select("conference_id")
      .eq("user_id", user.id);
    const allowedIds = [
      ...new Set(
        (seats ?? []).map((s) => s.conference_id).filter((id): id is string => Boolean(id))
      ),
    ];
    if (allowedIds.length === 0) {
      return (
        <MunPageShell title={t("committeeCodes")} variant="default">
          <p className="text-sm text-brand-muted mb-4 max-w-xl">{tRoom("noSeat")}</p>
        </MunPageShell>
      );
    }
    conferencesQuery = conferencesQuery.in("id", allowedIds);
  }

  const { data: conferencesRaw } = await conferencesQuery;
  let conferences = (conferencesRaw ?? []) as ConfRow[];

  // Staff/admin (and testing chairs): chamber-dedupe like SMT room-codes.
  if (isAdminRole(role) || (isSmtRole(role) && smtSurface !== "chair") || bypassSeatRestriction) {
    conferences = collapseToChamberOptions(
      filterConferencesForSmtRoomCodes(
        conferences.filter((c) => !isSmtSecretariatConferenceRow(c))
      )
    );
  } else if (role === "chair") {
    // Real chairs: still dedupe siblings so the current code always shows.
    conferences = collapseToChamberOptions(conferences);
  }

  return (
    <MunPageShell title={t("committeeCodes")} variant="offset">
      <p className="text-sm text-brand-muted mb-6 max-w-xl">
        {tRoom("intro")}
        {role === "chair" && bypassSeatRestriction ? (
          <> {tRoom("testingOverride")}</>
        ) : role === "chair" || effectiveRole === "chair" ? (
          <> {tRoom("chairScope")}</>
        ) : (
          <> {tRoom("staffAfterSave")}</>
        )}
      </p>
      <RoomCodeChairForm conferences={conferences} />
    </MunPageShell>
  );
}
