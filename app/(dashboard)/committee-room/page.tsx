import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import {
  VirtualCommitteeRoom,
  type DaisSeat,
  type DelegatePlacard,
} from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import { requireActiveConferenceId } from "@/lib/active-conference";

type ProfileEmbed = {
  name: string | null;
  pronouns: string | null;
  school: string | null;
};

function embedProfile(
  p: ProfileEmbed | ProfileEmbed[] | null
): ProfileEmbed | null {
  if (p == null) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

export default async function CommitteeRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const conferenceId = await requireActiveConferenceId();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canManageSeats = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("id", conferenceId)
    .maybeSingle();

  const { data: allocationRows } = await supabase
    .from("allocations")
    .select(
      "id, country, user_id, display_name_override, display_pronouns_override, display_school_override, profiles(name, pronouns, school)"
    )
    .eq("conference_id", conferenceId)
    .order("country");

  const placards: DelegatePlacard[] = (allocationRows ?? []).map((row) => {
    const p = embedProfile(
      row.profiles as ProfileEmbed | ProfileEmbed[] | null
    );
    const vacant = !row.user_id;
    const nameOverride = String(row.display_name_override ?? "").trim();
    const pronounsOverride = String(row.display_pronouns_override ?? "").trim();
    const schoolOverride = String(row.display_school_override ?? "").trim();
    return {
      country: String(row.country ?? "").trim() || "—",
      name: vacant
        ? null
        : nameOverride
          ? nameOverride
          : p?.name?.trim() || null,
      school: vacant
        ? null
        : schoolOverride
          ? schoolOverride
          : p?.school?.trim() || null,
      pronouns: vacant
        ? null
        : pronounsOverride
          ? pronounsOverride
          : p?.pronouns?.trim() || null,
      vacant,
    };
  });

  const { data: staff } = await supabase
    .from("profiles")
    .select("name, role")
    .in("role", ["chair", "smt", "admin"]);

  const chairs = (staff ?? []).filter((p) => p.role === "chair");
  const smt = (staff ?? []).filter((p) => p.role === "smt" || p.role === "admin");

  const { data: delegates } = canManageSeats
    ? await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "delegate")
        .order("name")
        .limit(500)
    : { data: [] as { id: string; name: string | null }[] };

  const dais: DaisSeat[] = [
    { title: "Chair", name: chairs[0]?.name ?? null, showGavel: true },
    {
      title: "Vice-Chair",
      name: chairs[1]?.name ?? smt[0]?.name ?? null,
      showGavel: true,
    },
    {
      title: "Rapporteur",
      name: chairs[2]?.name ?? smt[1]?.name ?? null,
      showGavel: true,
    },
  ];

  return (
    <MunPageShell title="Virtual committee room">
      <VirtualCommitteeRoom
        conferenceName={conference?.name ?? "Conference"}
        committeeName={conference?.committee ?? "General Assembly"}
        placards={placards}
        dais={dais}
      />

      {canManageSeats ? (
        <CommitteeRoomStaffControls
          allocations={(allocationRows ?? []).map((r) => ({
            id: r.id as string,
            country: r.country as string | null,
            user_id: r.user_id as string | null,
            display_name_override: r.display_name_override as string | null,
            display_pronouns_override: r.display_pronouns_override as string | null,
            display_school_override: r.display_school_override as string | null,
          }))}
          delegates={(delegates ?? []) as { id: string; name: string | null }[]}
        />
      ) : null}
    </MunPageShell>
  );
}
