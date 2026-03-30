/** Row keys in `committee_synced_state` (must match migration CHECK). */
export const COMMITTEE_SYNCED_STATE_KEYS = {
  CHAIR_PREP_CHECKLIST: "chair_prep_checklist",
  CHAIR_FLOW_CHECKLIST: "chair_flow_checklist",
  DIGITAL_ROOM_FLAGS: "digital_room_flags",
  MOTIONS_LOG: "motions_log",
  DELEGATE_COUNTDOWN: "delegate_countdown",
} as const;

export type CommitteeSyncedStateKey =
  (typeof COMMITTEE_SYNCED_STATE_KEYS)[keyof typeof COMMITTEE_SYNCED_STATE_KEYS];
