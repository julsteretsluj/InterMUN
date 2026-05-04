import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairDigitalRoomClient } from "@/components/chair/ChairDigitalRoomClient";
import { type RollAttendance, parseRollAttendance } from "@/lib/roll-attendance";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { getTranslations } from "next-intl/server";
import { getChamberScope } from "@/lib/chamber-scope";
import { mergeAllocationsAcrossSiblingConferences } from "@/lib/conference-committee-canonical";

export default async function ChairDigitalRoomPage() {
  const t = await getTranslations("pageTitles");
  const tRoom = await getTranslations("chairDigitalRoom");
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
  const role = profile?.role?.toString().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    redirect("/profile");
  }

  const conferenceId = await requireActiveConferenceId();
  const scope = await getChamberScope(supabase, conferenceId);

  const [{ data: conf }, { data: allocationRows }, { data: rollRows }] = await Promise.all([
    supabase
      .from("conferences")
      .select("committee, tagline, name")
      .eq("id", scope.canonicalConferenceId)
      .maybeSingle(),
    supabase
      .from("allocations")
      .select("id, conference_id, country, user_id")
      .in("conference_id", scope.siblingConferenceIds),
    supabase
      .from("roll_call_entries")
      .select("allocation_id, conference_id, present, attendance")
      .in("conference_id", scope.siblingConferenceIds),
  ]);

  const committeeLine =
    [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || tRoom("committeeFallback");

  const mergedAllocationRows = mergeAllocationsAcrossSiblingConferences(
    (allocationRows ?? []).map((r) => ({
      ...r,
      conference_id: r.conference_id,
    })),
    scope.canonicalConferenceId
  );
  const allocationUserIds = [
    ...new Set(mergedAllocationRows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: allocationProfiles } =
    allocationUserIds.length > 0
      ? await supabase.from("profiles").select("id, role").in("id", allocationUserIds)
      : { data: [] as { id: string; role: string | null }[] };
  const roleByProfileId = new Map((allocationProfiles ?? []).map((p) => [p.id, p.role ?? null]));

  const allocations = mergedAllocationRows.map((r) => ({
    id: r.id,
    country: r.country?.trim() || "—",
    user_id: r.user_id,
    userRole: r.user_id ? roleByProfileId.get(r.user_id) ?? null : null,
  }));

  const rollAttendanceByAllocationId: Record<string, RollAttendance> = {};
  for (const row of rollRows ?? []) {
    if (row.allocation_id != null) {
      const raw = row as { allocation_id: string; present?: boolean; attendance?: string | null };
      const att =
        parseRollAttendance(raw.attendance) ?? (raw.present === true ? "present_voting" : "absent");
      rollAttendanceByAllocationId[row.allocation_id] = att;
    }
  }

  return (
    <MunPageShell title={t("digitalRoom")}>
      <ChairDigitalRoomClient
        conferenceId={scope.canonicalConferenceId}
        committeeLine={committeeLine}
        allocations={allocations}
        rollAttendanceByAllocationId={rollAttendanceByAllocationId}
        isCrisisCommittee={isCrisisCommittee(conf?.committee ?? null)}
      />
    </MunPageShell>
  );
}
