import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { VirtualCommitteeRoom } from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { loadCommitteeRoomPayload } from "@/lib/committee-room-payload";

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

  const payload = await loadCommitteeRoomPayload(supabase, conferenceId, {
    includeDelegatesForStaff: canManageSeats,
  });

  return (
    <MunPageShell title="Virtual committee room">
      <VirtualCommitteeRoom
        conferenceName={payload.conference?.name ?? "Conference"}
        committeeName={payload.conference?.committee ?? "General Assembly"}
        placards={payload.placards}
        dais={payload.dais}
      />

      {canManageSeats ? (
        <CommitteeRoomStaffControls
          allocations={payload.staffAllocations}
          delegates={payload.delegates}
        />
      ) : null}
    </MunPageShell>
  );
}
