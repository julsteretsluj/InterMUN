"use server";

import { createClient } from "@/lib/supabase/server";
import { getChamberScope } from "@/lib/chamber-scope";
import {
  buildAllocationRecipientOptions,
  buildChairRecipientOptions,
} from "@/lib/delegation-notes-options";

export type SmtDelegationNotesComposeContext = {
  conferenceId: string;
  canonicalConferenceId: string;
  allocationOptions: { id: string; country: string }[];
  chairOptions: { id: string; name: string }[];
  advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }>;
  sessionActive: boolean;
  unmoderatedLocked: boolean;
  votingProcedureLocked: boolean;
};

export async function getSmtDelegationNotesComposeContext(
  conferenceId: string
): Promise<{ context?: SmtDelegationNotesComposeContext; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role ?? "").toString().toLowerCase();
  if (role !== "smt" && role !== "admin") {
    return { error: "Only secretariat can compose from this panel." };
  }

  const scope = await getChamberScope(supabase, conferenceId);

  const { data: allocations } = await supabase
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", scope.siblingConferenceIds);

  const allocationOptions = buildAllocationRecipientOptions(allocations ?? [], scope.canonicalConferenceId);

  const { data: chairProfiles } = await supabase.from("profiles").select("id, name").eq("role", "chair");
  const chairOptions = buildChairRecipientOptions(chairProfiles ?? [], "Chair");

  const { data: advisorAssignRows } = await supabase
    .from("advisor_delegate_assignments")
    .select("delegate_allocation_id, advisor_profile_id, profiles:advisor_profile_id ( name )")
    .in("conference_id", scope.siblingConferenceIds);

  const advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }> = {};
  for (const row of advisorAssignRows ?? []) {
    const profRaw = row.profiles as { name: string | null } | { name: string | null }[] | null;
    const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw;
    advisorByAllocationId[row.delegate_allocation_id] = {
      advisorProfileId: row.advisor_profile_id,
      name: prof?.name?.trim() || "Advisor",
    };
  }

  const { data: procedureState } = await supabase
    .from("procedure_states")
    .select("committee_session_started_at, state, current_vote_item_id")
    .eq("conference_id", scope.canonicalConferenceId)
    .maybeSingle();

  const sessionActive = Boolean(
    (procedureState as { committee_session_started_at?: string | null } | null)?.committee_session_started_at
  );

  let unmoderatedLocked = false;
  let votingProcedureLocked = false;
  const proc = procedureState as {
    state?: string | null;
    current_vote_item_id?: string | null;
  } | null;
  if (proc?.state === "voting_procedure" && proc.current_vote_item_id) {
    votingProcedureLocked = true;
    const { data: voteItem } = await supabase
      .from("vote_items")
      .select("procedure_code")
      .eq("id", proc.current_vote_item_id)
      .maybeSingle();
    unmoderatedLocked = voteItem?.procedure_code === "unmoderated_caucus";
  }

  return {
    context: {
      conferenceId,
      canonicalConferenceId: scope.canonicalConferenceId,
      allocationOptions,
      chairOptions,
      advisorByAllocationId,
      sessionActive,
      unmoderatedLocked,
      votingProcedureLocked,
    },
  };
}
