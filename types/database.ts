export type UserRole = "delegate" | "chair" | "smt" | "admin";
export type VoteType = "motion" | "amendment" | "resolution" | "agenda";
export type VoteValue = "yes" | "no" | "abstain";
export type BlocStance = "for" | "against";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  username: string | null;
  pronouns: string | null;
  school: string | null;
  grade: string | null;
  notes: string | null;
  profile_picture_url: string | null;
  conferences_attended: number;
  awards: string[];
  allocation: string | null;
  stance_overview: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface Conference {
  id: string;
  event_id?: string;
  name: string;
  committee: string | null;
  tagline?: string | null;
  room_code?: string | null;
  committee_code?: string | null;
  committee_logo_url?: string | null;
  committee_password_hash?: string | null;
  /** Google Slides URL for crisis committees (in-app embed). */
  crisis_slides_url?: string | null;
  /** Third gate: require per-seat placard code from allocation_gate_codes. */
  allocation_code_gate_enabled?: boolean;
  /** Competing-motion order: consultation ranks above moderated caucus unless false. */
  consultation_before_moderated_caucus?: boolean;
  /** Procedure ruleset profile for committee-specific RoP flows. */
  procedure_profile?: "default" | "eu_parliament";
  /** Enables EU guided workflow checks when procedure_profile is eu_parliament. */
  eu_guided_workflow_enabled?: boolean;
  created_at: string;
}

export interface VoteItem {
  id: string;
  conference_id: string;
  vote_type: VoteType;
  title: string | null;
  description: string | null;
  must_vote: boolean;
  required_majority: string;
  /** Delegate allocation that moved the motion (optional). */
  motioner_allocation_id?: string | null;
  /** False while motion is only stated on the floor; true when delegates may vote. */
  open_for_voting?: boolean;
  created_at: string;
  closed_at: string | null;
}

export interface AwardParticipationScore {
  id: string;
  scope: string;
  committee_conference_id: string;
  subject_profile_id: string | null;
  rubric_scores: Record<string, number> | null;
  /** Floor evidence / confirmation text (required for delegate chair feedback in-app). */
  evidence_statement?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AwardAssignment {
  id: string;
  category: string;
  committee_conference_id: string | null;
  recipient_profile_id: string | null;
  recipient_committee_id: string | null;
  notes: string | null;
  /** Per-criterion 1–8 scores (SEAMUN bands); null or omitted for committee-scoped assignments / legacy rows. */
  rubric_scores?: Record<string, number> | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resolution {
  id: string;
  conference_id: string;
  google_docs_url: string | null;
  main_submitters: string[];
  co_submitters: string[];
  signatories: string[];
  visible_to_other_bloc: boolean;
  created_at: string;
  updated_at: string;
}

export interface DelegateDisciplineRecord {
  id: string;
  conference_id: string;
  allocation_id: string;
  warning_count: number;
  strike_count: number;
  voting_rights_lost: boolean;
  speaking_rights_suspended: boolean;
  removed_from_committee: boolean;
  updated_at: string;
}

export interface DelegateDisciplineEvent {
  id: string;
  conference_id: string;
  allocation_id: string;
  chair_user_id: string | null;
  action: "warning" | "strike" | "revoke_warning" | "revoke_strike" | "reset";
  reason: string | null;
  warning_count_after: number;
  strike_count_after: number;
  created_at: string;
}
