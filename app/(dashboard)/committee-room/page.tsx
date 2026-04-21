import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { loadCommitteeRoomPayload } from "@/lib/committee-room-payload";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { CommitteeRoomDigitalMUNClient } from "@/components/committee-room/CommitteeRoomDigitalMUNClient";
import { sortAllocationsByDisplayCountry } from "@/lib/allocation-display-order";

export default async function CommitteeRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const conferenceId = await requireActiveConferenceId();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role || "delegate").toString().toLowerCase();
  const canManageSeats = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const payload = await loadCommitteeRoomPayload(supabase, conferenceId, {
    includeDelegatesForStaff: canManageSeats,
  });
  const debateBundle = await getResolvedDebateConferenceBundle(supabase, conferenceId);

  const allocationOptions = sortAllocationsByDisplayCountry(
    payload.staffAllocations
      .filter((a) => Boolean(a.user_id))
      .map((a) => ({ id: a.id, country: a.country ?? "—" }))
  );

  const myAllocationId =
    payload.staffAllocations.find((a) => a.user_id === user.id)?.id ?? null;

  const myAllocationCountry =
    allocationOptions.find((a) => a.id === myAllocationId)?.country ?? null;

  const { data: chairProfiles } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "chair")
    .order("name");

  return (
    <MunPageShell title="Committee room">
      <CommitteeRoomDigitalMUNClient
        conferenceId={conferenceId}
        floorConferenceId={debateBundle.debateConferenceId}
        canonicalConferenceId={debateBundle.canonicalConferenceId}
        siblingConferenceIds={debateBundle.siblingConferenceIds}
        conferenceName={payload.conference?.name ?? "Conference"}
        committeeName={payload.conference?.committee ?? "General Assembly"}
        placards={payload.placards}
        dais={payload.dais}
        myRole={myRole}
        myAllocationId={myAllocationId}
        myAllocationCountry={myAllocationCountry}
        canManageSeats={canManageSeats}
        staffAllocations={payload.staffAllocations}
        delegates={payload.delegates}
        chairs={(chairProfiles ?? []).map((c) => ({ id: c.id, name: c.name ?? "Chair" }))}
      />
    </MunPageShell>
  );
}
