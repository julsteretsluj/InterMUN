"use client";

import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { RequestToSpeakClient } from "@/components/session/RequestToSpeakClient";
import { SessionControlClient } from "@/app/(dashboard)/chair/session/SessionControlClient";
import { MotionVotingClient } from "@/components/session/MotionVotingClient";

export function CommitteeRoomSessionFloor({
  conferenceId,
  conferenceTitle,
  myRole,
  myAllocationId,
  myAllocationCountry,
  observeDelegatesOnly = false,
  procedureState,
  currentVoteItemId,
}: {
  conferenceId: string;
  conferenceTitle: string;
  myRole: string;
  myAllocationId: string | null;
  myAllocationCountry: string | null;
  observeDelegatesOnly?: boolean;
  procedureState?: "debate_open" | "voting_procedure";
  currentVoteItemId?: string | null;
}) {
  const role = myRole.toLowerCase();

  const isChairLike = role === "chair" || role === "admin";
  const isSmtLike = role === "smt" || role === "admin";
  const isDelegate = role === "delegate";

  // Chair/SMT admins: interactive session floor.
  if (isChairLike || isSmtLike) {
    return (
      <div className="space-y-4">
        <SessionControlClient conferenceId={conferenceId} conferenceTitle={conferenceTitle} />
      </div>
    );
  }

  // Delegates: live status + request-to-speak.
  return (
    <div className="space-y-4">
      <FloorStatusBar
        conferenceId={conferenceId}
        observeOnly={observeDelegatesOnly}
        theme="dark"
        activeMotionVoteItemId={
          procedureState === "voting_procedure" ? (currentVoteItemId ?? null) : null
        }
      />
      {isDelegate ? (
        <>
          {procedureState === "voting_procedure" ? (
            <MotionVotingClient voteItemId={currentVoteItemId ?? null} />
          ) : null}
          <RequestToSpeakClient
            conferenceId={conferenceId}
            allocationId={myAllocationId}
            allocationCountry={myAllocationCountry}
            disabled={procedureState === "voting_procedure"}
          />
        </>
      ) : null}
    </div>
  );
}

