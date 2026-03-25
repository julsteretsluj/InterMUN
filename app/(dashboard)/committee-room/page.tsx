import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import {
  VirtualCommitteeRoom,
  type DaisSeat,
} from "@/components/committee-room/VirtualCommitteeRoom";

const DEFAULT_CONFERENCE_ID = "00000000-0000-0000-0000-000000000001";

export default async function CommitteeRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const conferenceId = conference?.id ?? DEFAULT_CONFERENCE_ID;

  const { data: allocations } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conferenceId);

  const { data: staff } = await supabase
    .from("profiles")
    .select("name, role")
    .in("role", ["chair", "smt"]);

  const placards = [
    ...new Set(
      (allocations ?? [])
        .map((a) => a.country?.trim())
        .filter((c): c is string => Boolean(c))
    ),
  ];

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
