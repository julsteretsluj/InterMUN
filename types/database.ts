export type UserRole = "delegate" | "chair" | "smt" | "admin";
export type VoteType = "motion" | "amendment" | "resolution";
export type VoteValue = "yes" | "no" | "abstain";
export type BlocStance = "for" | "against";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  username: string | null;
  pronouns: string | null;
  school: string | null;
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
  created_at: string;
  closed_at: string | null;
}

export interface AwardAssignment {
  id: string;
  category: string;
  committee_conference_id: string | null;
  recipient_profile_id: string | null;
  recipient_committee_id: string | null;
  notes: string | null;
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
