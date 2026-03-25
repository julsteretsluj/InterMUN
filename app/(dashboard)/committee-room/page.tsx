import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import {
  VirtualCommitteeRoom,
  type DaisSeat,
  type DelegatePlacard,
} from "@/components/committee-room/VirtualCommitteeRoom";
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

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("id", conferenceId)
    .maybeSingle();

  const { data: allocationRows } = await supabase
    .from("allocations")
    .select("country, user_id, profiles(name, pronouns, school)")
    .eq("conference_id", conferenceId)
    .order("country");

  const placards: DelegatePlacard[] = (allocationRows ?? []).map((row) => {
    const p = embedProfile(
      row.profiles as ProfileEmbed | ProfileEmbed[] | null
    );
    return {
      country: String(row.country ?? "").trim() || "—",
      name: p?.name?.trim() || null,
      school: p?.school?.trim() || null,
      pronouns: p?.pronouns?.trim() || null,
      vacant: false,
    };
  });

  const { data: staff } = await supabase
    .from("profiles")
    .select("name, role")
    .in("role", ["chair", "smt"]);

  const chairs = (staff ?? []).filter((p) => p.role === "chair");
  const smt = (staff ?? []).filter((p) => p.role === "smt");

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
    </MunPageShell>
  );
}
