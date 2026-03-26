import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { VirtualCommitteeRoom } from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { loadCommitteeRoomPayload } from "@/lib/committee-room-payload";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { DelegationNotesView } from "@/components/delegation-notes/DelegationNotesView";

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
  const myProfileName = profile?.name ?? "Chair";
  const canManageSeats = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const payload = await loadCommitteeRoomPayload(supabase, conferenceId, {
    includeDelegatesForStaff: canManageSeats,
  });

  const verifiedConferenceId = await getVerifiedConferenceId();
  const smtVerified = myRole === "smt" && verifiedConferenceId === conferenceId;

  const allocationOptions = payload.staffAllocations
    .filter((a) => Boolean(a.user_id))
    .map((a) => ({ id: a.id, country: a.country ?? "—" }));

  const myAllocationId =
    payload.staffAllocations.find((a) => a.user_id === user.id)?.id ?? null;

  const { data: chairProfiles } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "chair")
    .order("name");

  return (
    <MunPageShell title="Virtual committee room">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        <VirtualCommitteeRoom
          conferenceId={conferenceId}
          conferenceName={payload.conference?.name ?? "Conference"}
          committeeName={payload.conference?.committee ?? "General Assembly"}
          placards={payload.placards}
          dais={payload.dais}
        />

        <div className="space-y-6">
          <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
            <DelegationNotesView
              conferenceId={conferenceId}
              initialNotes={[]}
              myUserId={user.id}
              myRole={myRole}
              smtVerified={smtVerified}
              myAllocationId={myAllocationId}
              myProfileName={myProfileName}
              allocationOptions={allocationOptions}
              chairOptions={(chairProfiles ?? []).map((c) => ({
                id: c.id,
                name: c.name ?? "Chair",
              }))}
              nextPathAfterVerification="/committee-room"
            />
          </div>

          {canManageSeats ? (
            <CommitteeRoomStaffControls
              allocations={payload.staffAllocations}
              delegates={payload.delegates}
            />
          ) : null}
        </div>
      </div>
    </MunPageShell>
  );
}
