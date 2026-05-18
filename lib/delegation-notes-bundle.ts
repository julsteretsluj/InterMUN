import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeDelegationRecipientRows } from "@/lib/delegation-notes-options";

export type NoteTopic =
  | "bloc forming"
  | "speech pois or pocs"
  | "questions"
  | "informal conversations";

type DelegationNoteRow = {
  id: string;
  conference_id: string;
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
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

export type NoteSender =
  | { kind: "allocation"; allocationId: string; country: string }
  | { kind: "profile"; profileId: string; name: string; role?: string };

export type NoteRecipient =
  | { kind: "allocation"; allocationId: string; country: string }
  | { kind: "chair"; profileId: string; name: string }
  | { kind: "chair_all" };

export type DelegationNoteBundleItem = {
  id: string;
  conference_id: string;
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
  created_at: string;
  forwarded_to_smt: boolean;
  forwarded_at: string | null;
  forwarded_to_advisor_profile_id: string | null;
  forwarded_to_advisor_at: string | null;
  sender: NoteSender;
  recipients: NoteRecipient[];
  starred_by_me: boolean;
};

export type DelegationNotesBundle = {
  notes: DelegationNoteBundleItem[];
  myAllocationIds: string[];
  advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }>;
  advisorNameByProfileId: Record<string, string>;
};

export async function loadDelegationNotesBundle(
  supabase: SupabaseClient,
  params: {
    conferenceIds: string[];
    userId: string;
    userRole: string;
    myProfileName: string;
    chairFallback: string;
    unknownCountry: string;
    advisorFallback: string;
    limit?: number;
  }
): Promise<DelegationNotesBundle> {
  const {
    conferenceIds,
    userId,
    userRole,
    myProfileName,
    chairFallback,
    unknownCountry,
    advisorFallback,
    limit = 500,
  } = params;

  if (conferenceIds.length === 0) {
    return { notes: [], myAllocationIds: [], advisorByAllocationId: {}, advisorNameByProfileId: {} };
  }

  const { data: notes } = await supabase
    .from("delegation_notes")
    .select("*")
    .in("conference_id", conferenceIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  const safeNotes = (notes ?? []) as DelegationNoteRow[];
  const noteIds = safeNotes.map((n) => n.id);

  const { data: allocations } = await supabase
    .from("allocations")
    .select("id, country, user_id")
    .in("conference_id", conferenceIds);

  const allocationRows = (allocations ?? []) as { id: string; country: string; user_id: string | null }[];
  const allocationMap = new Map<string, string>();
  for (const a of allocationRows.filter((a) => a.user_id)) {
    allocationMap.set(a.id, a.country);
  }

  const myAllocationIds = allocationRows.filter((a) => a.user_id === userId).map((a) => a.id);

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

  const starredByMe = new Set<string>();
  if ((userRole === "chair" || userRole === "admin" || userRole === "smt") && noteIds.length > 0) {
    const { data: starRows } = await supabase
      .from("delegation_note_stars")
      .select("note_id")
      .eq("chair_profile_id", userId)
      .in("note_id", noteIds);
    for (const s of (starRows ?? []) as { note_id: string }[]) starredByMe.add(s.note_id);
  }

  const neededProfileIds = new Set<string>();
  for (const n of safeNotes) {
    if (n.sender_profile_id) neededProfileIds.add(n.sender_profile_id);
  }
  for (const rowArr of recipientsByNoteId.values()) {
    for (const r of rowArr) {
      if (r.recipient_profile_id) neededProfileIds.add(r.recipient_profile_id);
    }
  }
  for (const n of safeNotes) {
    if (n.forwarded_to_advisor_profile_id) neededProfileIds.add(n.forwarded_to_advisor_profile_id);
  }

  const profileMap = new Map<string, { name: string; role: string }>();
  if (neededProfileIds.size > 0) {
    const { data: neededProfiles } = await supabase
      .from("profiles")
      .select("id, name, role")
      .in("id", Array.from(neededProfileIds));

    for (const p of (neededProfiles ?? []) as { id: string; name: string | null; role: string | null }[]) {
      profileMap.set(p.id, {
        name: p.name ?? chairFallback,
        role: (p.role ?? "").toString().toLowerCase(),
      });
    }
  }

  const { data: advisorAssignRows } = await supabase
    .from("advisor_delegate_assignments")
    .select("delegate_allocation_id, advisor_profile_id, profiles:advisor_profile_id ( name )")
    .in("conference_id", conferenceIds);

  const advisorByAllocationId: Record<string, { advisorProfileId: string; name: string }> = {};
  const advisorNameByProfileId: Record<string, string> = {};
  for (const row of advisorAssignRows ?? []) {
    const profRaw = row.profiles as { name: string | null } | { name: string | null }[] | null;
    const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw;
    const name = prof?.name?.trim() || advisorFallback;
    advisorByAllocationId[row.delegate_allocation_id] = {
      advisorProfileId: row.advisor_profile_id,
      name,
    };
    advisorNameByProfileId[row.advisor_profile_id] = name;
  }

  const bundleNotes = safeNotes.map<DelegationNoteBundleItem>((n) => {
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
            profileId: senderProfileId ?? userId,
            name: profileMap.get(senderProfileId ?? "")?.name ?? myProfileName,
            role: profileMap.get(senderProfileId ?? "")?.role,
          } as const);

    const recipientRows = dedupeDelegationRecipientRows(recipientsByNoteId.get(n.id) ?? []);
    const recipients = recipientRows.map<NoteRecipient>((r) => {
      if (r.recipient_kind === "allocation") {
        return {
          kind: "allocation",
          allocationId: r.recipient_allocation_id as string,
          country: allocationMap.get(r.recipient_allocation_id ?? "") ?? unknownCountry,
        } as const;
      }
      if (r.recipient_kind === "chair") {
        return {
          kind: "chair",
          profileId: r.recipient_profile_id as string,
          name: profileMap.get(r.recipient_profile_id as string)?.name ?? chairFallback,
        } as const;
      }
      return { kind: "chair_all" } as const;
    });

    return {
      id: n.id,
      conference_id: n.conference_id,
      topic: n.topic,
      content: n.content,
      concern_flag: n.concern_flag,
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

  return {
    notes: bundleNotes,
    myAllocationIds,
    advisorByAllocationId,
    advisorNameByProfileId,
  };
}
