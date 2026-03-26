"use client";

import { useMemo, useState } from "react";
import { VirtualCommitteeRoom } from "@/components/committee-room/VirtualCommitteeRoom";
import type { DaisSeat, DelegatePlacard } from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import { CommitteeRoomSessionFloor } from "@/components/committee-room/CommitteeRoomSessionFloor";
import { DelegationNotesView } from "@/components/delegation-notes/DelegationNotesView";
import type { StaffAllocationRow } from "@/lib/committee-room-payload";

export function CommitteeRoomDigitalMUNClient({
  conferenceId,
  conferenceName,
  committeeName,
  placards,
  dais,
  myRole,
  myUserId,
  smtVerified,
  myAllocationId,
  myProfileName,
  allocationOptions,
  chairOptions,
  myAllocationCountry,
  canManageSeats,
  staffAllocations,
  delegates,
}: {
  conferenceId: string;
  conferenceName: string;
  committeeName: string;
  placards: DelegatePlacard[];
  dais: DaisSeat[];
  myRole: string;
  myUserId: string;
  smtVerified: boolean;
  myAllocationId: string | null;
  myProfileName: string;
  allocationOptions: { id: string; country: string }[];
  chairOptions: { id: string; name: string }[];
  myAllocationCountry: string | null;
  canManageSeats: boolean;
  staffAllocations: StaffAllocationRow[];
  delegates: { id: string; name: string | null }[];
}) {
  const role = myRole.toLowerCase();
  const isChairLike = role === "chair" || role === "admin";
  const isDelegate = role === "delegate";

  const canClickSelectRecipients = isDelegate || isChairLike;

  const [selectedAllocationRecipientIds, setSelectedAllocationRecipientIds] = useState<string[]>([]);
  const [selectedChairRecipientIds, setSelectedChairRecipientIds] = useState<string[]>([]);
  const [anyChairRecipient, setAnyChairRecipient] = useState(false);

  const selectedAllocationRecipientIdsControlled = useMemo(
    () => (canClickSelectRecipients ? selectedAllocationRecipientIds : []),
    [canClickSelectRecipients, selectedAllocationRecipientIds]
  );
  const selectedChairRecipientIdsControlled = useMemo(
    () => (canClickSelectRecipients ? selectedChairRecipientIds : []),
    [canClickSelectRecipients, selectedChairRecipientIds]
  );

  function toggleAllocationRecipient(allocationId: string) {
    setSelectedAllocationRecipientIds((prev) => {
      if (prev.includes(allocationId)) return prev.filter((x) => x !== allocationId);
      return [...prev, allocationId];
    });
  }

  function toggleChairRecipient(chairProfileId: string) {
    if (anyChairRecipient) setAnyChairRecipient(false);
    setSelectedChairRecipientIds((prev) => {
      const already = prev.includes(chairProfileId);
      if (already) return prev.filter((x) => x !== chairProfileId);
      return [...prev, chairProfileId];
    });
  }

  function onAnyChairRecipientChange(next: boolean) {
    setAnyChairRecipient(next);
    if (next) setSelectedChairRecipientIds([]);
  }

  function clearRecipientSelection() {
    setSelectedAllocationRecipientIds([]);
    setSelectedChairRecipientIds([]);
    setAnyChairRecipient(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
      <VirtualCommitteeRoom
        conferenceId={conferenceId}
        conferenceName={conferenceName}
        committeeName={committeeName}
        placards={placards}
        dais={dais}
        selectedAllocationRecipientIds={selectedAllocationRecipientIdsControlled}
        onToggleAllocationRecipient={
          canClickSelectRecipients ? (id) => toggleAllocationRecipient(id) : undefined
        }
        selectedChairRecipientIds={selectedChairRecipientIdsControlled}
        anyChairRecipient={canClickSelectRecipients ? anyChairRecipient : false}
        onToggleChairRecipient={canClickSelectRecipients ? (id) => toggleChairRecipient(id) : undefined}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
            <DelegationNotesView
              conferenceId={conferenceId}
              initialNotes={[]}
              myUserId={myUserId}
              myRole={myRole}
              smtVerified={smtVerified}
              myAllocationId={myAllocationId}
              myProfileName={myProfileName}
              allocationOptions={allocationOptions}
              chairOptions={chairOptions}
              nextPathAfterVerification="/committee-room"
              selectedAllocationRecipientIds={
                canClickSelectRecipients ? selectedAllocationRecipientIdsControlled : undefined
              }
              selectedChairRecipientIds={
                canClickSelectRecipients ? selectedChairRecipientIdsControlled : undefined
              }
              anyChairRecipient={canClickSelectRecipients ? anyChairRecipient : undefined}
              onToggleAllocationRecipient={
                canClickSelectRecipients ? (id) => toggleAllocationRecipient(id) : undefined
              }
              onToggleChairRecipient={
                canClickSelectRecipients ? (id) => toggleChairRecipient(id) : undefined
              }
              onAnyChairRecipientChange={canClickSelectRecipients ? onAnyChairRecipientChange : undefined}
              onClearRecipientSelection={canClickSelectRecipients ? clearRecipientSelection : undefined}
            />
          </div>

          <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
            <CommitteeRoomSessionFloor
              conferenceId={conferenceId}
              conferenceTitle={`${conferenceName} — ${committeeName}`}
              myRole={myRole}
              myAllocationId={myAllocationId}
              myAllocationCountry={myAllocationCountry}
              observeDelegatesOnly={false}
            />
          </div>
        </div>

        {canManageSeats ? (
          <CommitteeRoomStaffControls allocations={staffAllocations} delegates={delegates} />
        ) : null}
      </div>
    </div>
  );
}

