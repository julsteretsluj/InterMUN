// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Same-tab + multi-surface refresh when the speaker list changes. */
export const SPEAKER_QUEUE_UPDATED_EVENT = "intermun:speaker-queue-updated";

export type SpeakerQueueUpdatedDetail = {
  conferenceId: string;
};

export function notifySpeakerQueueUpdated(conferenceId: string) {
  if (typeof window === "undefined" || !conferenceId) return;
  window.dispatchEvent(
    new CustomEvent<SpeakerQueueUpdatedDetail>(SPEAKER_QUEUE_UPDATED_EVENT, {
      detail: { conferenceId },
    })
  );
}

export function speakerQueueUpdatedMatches(
  event: Event,
  conferenceId: string | null | undefined
): boolean {
  if (!conferenceId) return false;
  const detail = (event as CustomEvent<SpeakerQueueUpdatedDetail>).detail;
  return detail?.conferenceId === conferenceId;
}
