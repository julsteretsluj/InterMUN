export type UserRole = "delegate" | "chair" | "smt";
export type VoteType = "motion" | "amendment" | "resolution";
export type VoteValue = "yes" | "no" | "abstain";
export type BlocStance = "for" | "against";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
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
  name: string;
  committee: string | null;
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
  created_at: string;
  closed_at: string | null;
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
