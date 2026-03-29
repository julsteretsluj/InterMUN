import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairDigitalRoomClient } from "@/components/chair/ChairDigitalRoomClient";
import { type RollAttendance, parseRollAttendance } from "@/lib/roll-attendance";

export default async function ChairDigitalRoomPage() {
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

  const [{ data: conf }, { data: allocationRows }, { data: rollRows }] = await Promise.all([
    supabase.from("conferences").select("committee, tagline, name").eq("id", conferenceId).maybeSingle(),
    supabase.from("allocations").select("id, country, user_id").eq("conference_id", conferenceId),
    supabase.from("roll_call_entries").select("allocation_id, present, attendance").eq("conference_id", conferenceId),
  ]);

  const committeeLine =
    [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || "Committee";

  const allocations = (allocationRows ?? []).map((r) => ({
    id: r.id,
    country: r.country?.trim() || "—",
    user_id: r.user_id,
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
    <MunPageShell title="Digital Room">
      <ChairDigitalRoomClient
        conferenceId={conferenceId}
        committeeLine={committeeLine}
        allocations={allocations}
        rollAttendanceByAllocationId={rollAttendanceByAllocationId}
      />
    </MunPageShell>
  );
}
