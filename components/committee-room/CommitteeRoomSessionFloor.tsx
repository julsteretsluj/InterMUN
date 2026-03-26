"use client";

import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { RequestToSpeakClient } from "@/components/session/RequestToSpeakClient";
import { SessionControlClient } from "@/app/(dashboard)/chair/session/SessionControlClient";

export function CommitteeRoomSessionFloor({
  conferenceId,
  conferenceTitle,
  myRole,
  myAllocationId,
  myAllocationCountry,
  observeDelegatesOnly = false,
}: {
  conferenceId: string;
  conferenceTitle: string;
  myRole: string;
  myAllocationId: string | null;
  myAllocationCountry: string | null;
  observeDelegatesOnly?: boolean;
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
      <FloorStatusBar conferenceId={conferenceId} observeOnly={observeDelegatesOnly} theme="dark" />
      {isDelegate ? (
        <RequestToSpeakClient
          conferenceId={conferenceId}
          allocationId={myAllocationId}
          allocationCountry={myAllocationCountry}
        />
      ) : null}
    </div>
  );
}

