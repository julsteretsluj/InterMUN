// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Browser event: committee session timer started/stopped/updated on the canonical chamber row. */
export const COMMITTEE_SESSION_UPDATED_EVENT = "intermun:committee-session-updated";

export function dispatchCommitteeSessionUpdated(canonicalConferenceId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMITTEE_SESSION_UPDATED_EVENT, {
      detail: { conferenceId: canonicalConferenceId },
    })
  );
}
