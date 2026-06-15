import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { DelegationNotesView } from "@/components/delegation-notes/DelegationNotesView";
import {
  buildAllocationRecipientOptions,
  buildChairRecipientOptions,
  dedupeDelegationRecipientRows,
} from "@/lib/delegation-notes-options";
import { getTranslations } from "next-intl/server";
import { getChamberScope } from "@/lib/chamber-scope";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NoteTopic = "bloc forming" | "speech pois or pocs" | "questions" | "informal conversations";

type DelegationNoteRow = {
  id: string;
  conference_id: string;
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
  moderation_state?: "approved" | "held" | "rejected";
  hold_reason?: string | null;
  moderation_note?: string | null;
  created_at: string;
  forwarded_to_smt: boolean;
  forwarded_at: string | null;
  forwarded_to_advisor_profile_id: string | null;
  forwarded_to_advisor_at: string | null;
  sender_allocation_id: string | null;
  sender_profile_id: string | null;
};

type DelegationRecipientRow = {
  note_id: string;
  recipient_kind: "allocation" | "chair" | "chair_all";
  recipient_allocation_id: string | null;
  recipient_profile_id: string | null;
};

type AllocationRow = { id: string; country: string; user_id: string | null };

type NoteSender =
  | { kind: "allocation"; allocationId: string; country: string }
  | { kind: "profile"; profileId: string; name: string };

type NoteRecipient =
  | { kind: "allocation"; allocationId: string; country: string }
  | { kind: "chair"; profileId: string; name: string }
  | { kind: "chair_all" };

type InitialDelegationNote = {
  id: string;
  conference_id: string;
  thread_id: string | null;
  reply_to_note_id: string | null;
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
  moderation_state: "approved" | "held" | "rejected";
  hold_reason: "profanity" | "concern_flag" | "reported" | null;
  moderation_note: string | null;
  created_at: string;
  forwarded_to_smt: boolean;
  forwarded_at: string | null;
  forwarded_to_advisor_profile_id: string | null;
  forwarded_to_advisor_at: string | null;
  sender: NoteSender;
  recipients: NoteRecipient[];
  starred_by_me: boolean;
};

function isDaisAllocationCountry(country: string): boolean {
  const n = country.trim().toLowerCase();
  return n === "head chair" || n === "co-chair" || n === "co chair";
}

export default async function ChatsNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ forProfile?: string; thread?: string }>;
}) {
  const t = await getTranslations("pageTitles");
  const tDn = await getTranslations("delegationNotes");
  const { forProfile, thread: initialThreadId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const conferenceId = await requireActiveConferenceId();
  const scope = await getChamberScope(supabase, conferenceId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();

  const myRole = (profile?.role ?? "delegate").toString().toLowerCase();
  if (myRole === "advisor") {
    redirect("/advisor");
  }
  const myProfileName = profile?.name ?? tDn("chairFallback");

  const verifiedConferenceId = await getVerifiedConferenceId();
  const isSmtLike = myRole === "smt";
  const smtVerified = isSmtLike && scope.siblingConferenceIds.includes(verifiedConferenceId ?? "");
  const { data: procedureState } = await supabase
    .from("procedure_states")
    .select("committee_session_started_at, state, current_vote_item_id")
    .eq("conference_id", scope.canonicalConferenceId)
    .maybeSingle();
  const sessionActive = Boolean(
    (procedureState as { committee_session_started_at?: string | null } | null)
      ?.committee_session_started_at
  );
  const activeProcedureCode =
    (procedureState as { state?: string | null; current_vote_item_id?: string | null } | null)?.state ===
      "voting_procedure" &&
    (procedureState as { current_vote_item_id?: string | null } | null)?.current_vote_item_id
      ? (
          await supabase
            .from("vote_items")
            .select("procedure_code")
            .eq(
              "id",
              (
                procedureState as {
                  current_vote_item_id?: string | null;
                }
              ).current_vote_item_id as string
            )
            .maybeSingle()
        ).data?.procedure_code ?? null
      : null;
  const unmoderatedLocked = activeProcedureCode === "unmoderated_caucus";

  // Fetch notes using the same visibility split as the spec:
  // - SMT unverified: forwarded notes only (SMT inbox)
  // - SMT verified: all notes
  // Delegates/chairs: rely on RLS and/or staff selection policies.
  let notesQuery = supabase
    .from("delegation_notes")
    .select("*")
    .in("conference_id", scope.siblingConferenceIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (isSmtLike && !smtVerified) {
    notesQuery = notesQuery.eq("forwarded_to_smt", true);
  }

  const { data: notes } = await notesQuery;
  const safeNotes = (notes ?? []) as DelegationNoteRow[];
  const noteIds = safeNotes.map((n) => n.id);

  // Allocations for recipient targeting + mapping country names.
  const { data: allocations } = await supabase
    .from("allocations")
    .select("id, country, user_id, conference_id")
    .in("conference_id", scope.siblingConferenceIds);

  const allocationRows = (allocations ?? []) as (AllocationRow & { conference_id: string })[];
  const allocationOptions = buildAllocationRecipientOptions(
    allocationRows,
    scope.canonicalConferenceId
  );

  const { data: myAllocations } = await supabase
    .from("allocations")
    .select("id")
    .in("conference_id", scope.siblingConferenceIds)
    .eq("user_id", user.id);

  const myAllocationId = (myAllocations?.[0]?.id as string | undefined) ?? null;

  const { data: chairProfiles } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "chair");

  const chairOptions = buildChairRecipientOptions(chairProfiles ?? [], tDn("chairFallback"));

  let initialSelectedAllocationRecipientIds: string[] | undefined;
  let initialSelectedChairRecipientIds: string[] | undefined;

  if (forProfile && UUID_RE.test(forProfile)) {
    const { data: targetAlloc } = await supabase
      .from("allocations")
      .select("id, country")
      .in("conference_id", scope.siblingConferenceIds)
      .eq("user_id", forProfile)
      .maybeSingle();

    if (targetAlloc?.id) {
      const country = String(targetAlloc.country ?? "");
      if (isDaisAllocationCountry(country)) {
        initialSelectedChairRecipientIds = [forProfile];
      } else {
        initialSelectedAllocationRecipientIds = [targetAlloc.id as string];
      }
    } else if (chairOptions.some((c) => c.id === forProfile)) {
      initialSelectedChairRecipientIds = [forProfile];
    }
  }

  // Recipients for notes list.
  const recipientsByNoteId = new Map<string, DelegationRecipientRow[]>();
  if (noteIds.length > 0) {
    const { data: recipientRows } = await supabase
      .from("delegation_note_recipients")
      .select("*")
      .in("note_id", noteIds);

    for (const row of (recipientRows ?? []) as DelegationRecipientRow[]) {
      const arr = recipientsByNoteId.get(row.note_id) ?? [];
      arr.push(row);
      recipientsByNoteId.set(row.note_id, arr);
    }
  }

  // Star state for current chair/admin.
  const starredByMe = new Set<string>();
  if ((myRole === "chair" || myRole === "admin") && noteIds.length > 0) {
    const { data: starRows } = await supabase
      .from("delegation_note_stars")
      .select("note_id")
      .eq("chair_profile_id", user.id)
      .in("note_id", noteIds);
    for (const s of (starRows ?? []) as { note_id: string }[]) starredByMe.add(s.note_id);
  }

  // Fetch sender/recipient profile names for chair recipients and chair sender.
  const neededProfileIds = new Set<string>();
  for (const n of safeNotes) {
    if (n.sender_profile_id) neededProfileIds.add(n.sender_profile_id);
  }
  for (const rowArr of recipientsByNoteId.values()) {
    for (const r of rowArr as DelegationRecipientRow[]) {
      if (r.recipient_profile_id) neededProfileIds.add(r.recipient_profile_id);
    }
  }

  const profileMap = new Map<string, string>();
  if (neededProfileIds.size > 0) {
    const { data: neededProfiles } = await supabase
      .from("profiles")
      .select("id, name, role")
      .in("id", Array.from(neededProfileIds));

    for (const p of (neededProfiles ?? []) as { id: string; name: string | null }[]) {
      profileMap.set(p.id, p.name ?? tDn("chairFallback"));
    }
  }

  // Allocation mapping for notes (sender + allocation recipients).
  const allocationMap = new Map<string, string>();
  for (const a of allocationRows) {
    if (a.country) allocationMap.set(a.id, a.country);
  }
  for (const opt of allocationOptions) {
    allocationMap.set(opt.id, opt.country);
  }

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
      name: prof?.name?.trim() || tDn("advisorFallback"),
    };
  }

  const initialNotes = safeNotes.map<InitialDelegationNote>((n) => {
    const senderAllocationId = n.sender_allocation_id;
    const senderProfileId = n.sender_profile_id;

    const sender =
      senderAllocationId && allocationMap.get(senderAllocationId)
        ? ({
            kind: "allocation",
            allocationId: senderAllocationId,
            country: allocationMap.get(senderAllocationId) as string,
          } as const)
        : ({
            kind: "profile",
            profileId: senderProfileId ?? user.id,
            name: profileMap.get(senderProfileId ?? "") ?? myProfileName,
          } as const);

    const recipientRows = dedupeDelegationRecipientRows(
      (recipientsByNoteId.get(n.id) ?? []) as DelegationRecipientRow[]
    );
    const recipients = recipientRows.map<NoteRecipient>((r) => {
      if (r.recipient_kind === "allocation") {
        const country = allocationMap.get(r.recipient_allocation_id ?? "") ?? tDn("unknownCountry");
        return {
          kind: "allocation",
          allocationId: r.recipient_allocation_id as string,
          country,
        } as const;
      }
      if (r.recipient_kind === "chair") {
        return {
          kind: "chair",
          profileId: r.recipient_profile_id as string,
          name: profileMap.get(r.recipient_profile_id as string) ?? tDn("chairFallback"),
        } as const;
      }
      return { kind: "chair_all" } as const;
    });

    return {
      id: n.id,
      conference_id: n.conference_id,
      thread_id: (n as { thread_id?: string | null }).thread_id ?? null,
      reply_to_note_id: (n as { reply_to_note_id?: string | null }).reply_to_note_id ?? null,
      topic: n.topic,
      content: n.content,
      concern_flag: n.concern_flag,
      moderation_state:
        n.moderation_state === "held" || n.moderation_state === "rejected"
          ? n.moderation_state
          : "approved",
      hold_reason:
        n.hold_reason === "profanity" ||
        n.hold_reason === "concern_flag" ||
        n.hold_reason === "reported"
          ? n.hold_reason
          : null,
      moderation_note: n.moderation_note ?? null,
      created_at: n.created_at,
      forwarded_to_smt: n.forwarded_to_smt,
      forwarded_at: n.forwarded_at,
      forwarded_to_advisor_profile_id: n.forwarded_to_advisor_profile_id ?? null,
      forwarded_to_advisor_at: n.forwarded_to_advisor_at ?? null,
      sender,
      recipients,
      starred_by_me: starredByMe.has(n.id),
    };
  });

  return (
    <MunPageShell title={t("notes")}>
      <DelegationNotesView
        conferenceId={scope.canonicalConferenceId}
        initialNotes={initialNotes}
        myUserId={user.id}
        myRole={myRole}
        smtVerified={smtVerified}
        myAllocationId={myAllocationId}
        myProfileName={myProfileName}
        allocationOptions={allocationOptions}
        chairOptions={chairOptions}
        sessionActive={sessionActive}
        unmoderatedLocked={unmoderatedLocked}
        initialSelectedAllocationRecipientIds={initialSelectedAllocationRecipientIds}
        initialSelectedChairRecipientIds={initialSelectedChairRecipientIds}
        advisorByAllocationId={advisorByAllocationId}
        initialOpenThreadId={initialThreadId ?? null}
      />
    </MunPageShell>
  );
}

