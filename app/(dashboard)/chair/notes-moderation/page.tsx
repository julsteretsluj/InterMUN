import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { getChamberScope } from "@/lib/chamber-scope";
import { dedupeDelegationRecipientRows } from "@/lib/delegation-notes-options";
import {
  DelegationNoteModerationQueue,
  type HeldDelegationNote,
} from "@/components/delegation-notes/DelegationNoteModerationQueue";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type HeldNoteRow = {
  id: string;
  topic: string;
  content: string;
  concern_flag: boolean;
  hold_reason: string | null;
  created_at: string;
  sender_allocation_id: string | null;
  sender_profile_id: string | null;
};

type RecipientRow = {
  note_id: string;
  recipient_kind: "allocation" | "chair" | "chair_all";
  recipient_allocation_id: string | null;
  recipient_profile_id: string | null;
};

export default async function ChairNotesModerationPage() {
  const t = await getTranslations("pageTitles");
  const tDn = await getTranslations("delegationNotes");
  const tMod = await getTranslations("delegationNotes.moderation");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "chair") redirect("/profile");

  const conferenceId = await requireActiveConferenceId();
  const scope = await getChamberScope(supabase, conferenceId);

  const { data: chairSeat } = await supabase
    .from("allocations")
    .select("id")
    .in("conference_id", scope.siblingConferenceIds)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!chairSeat?.id) redirect("/chair");

  const { data: heldRows } = await supabase
    .from("delegation_notes")
    .select(
      "id, topic, content, concern_flag, hold_reason, created_at, sender_allocation_id, sender_profile_id"
    )
    .in("conference_id", scope.siblingConferenceIds)
    .eq("moderation_state", "held")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (heldRows ?? []) as HeldNoteRow[];
  const noteIds = rows.map((r) => r.id);

  const { data: allocRows } = await supabase
    .from("allocations")
    .select("id, country, user_id")
    .in("conference_id", scope.siblingConferenceIds);

  const allocationCountry = new Map(
    (allocRows ?? []).map((a) => [a.id, a.country] as const)
  );

  const profileIds = new Set<string>();
  for (const row of rows) {
    if (row.sender_profile_id) profileIds.add(row.sender_profile_id);
  }

  const { data: recipientRows } =
    noteIds.length > 0
      ? await supabase.from("delegation_note_recipients").select("*").in("note_id", noteIds)
      : { data: [] as RecipientRow[] };

  for (const r of recipientRows ?? []) {
    if (r.recipient_profile_id) profileIds.add(r.recipient_profile_id);
  }

  const { data: profileRows } =
    profileIds.size > 0
      ? await supabase.from("profiles").select("id, name").in("id", [...profileIds])
      : { data: [] as { id: string; name: string | null }[] };

  const profileName = new Map(
    (profileRows ?? []).map((p) => [p.id, p.name?.trim() || tDn("chairFallback")] as const)
  );

  const recipientsByNote = new Map<string, RecipientRow[]>();
  for (const row of (recipientRows ?? []) as RecipientRow[]) {
    const arr = recipientsByNote.get(row.note_id) ?? [];
    arr.push(row);
    recipientsByNote.set(row.note_id, arr);
  }

  function formatRecipients(noteId: string): string {
    const deduped = dedupeDelegationRecipientRows(recipientsByNote.get(noteId) ?? []);
    const labels: string[] = [];
    const seenAlloc = new Set<string>();
    const seenChair = new Set<string>();
    let chairAll = false;
    for (const r of deduped) {
      if (r.recipient_kind === "allocation" && r.recipient_allocation_id) {
        if (seenAlloc.has(r.recipient_allocation_id)) continue;
        seenAlloc.add(r.recipient_allocation_id);
        labels.push(allocationCountry.get(r.recipient_allocation_id) ?? tDn("unknownCountry"));
      } else if (r.recipient_kind === "chair" && r.recipient_profile_id) {
        if (seenChair.has(r.recipient_profile_id)) continue;
        seenChair.add(r.recipient_profile_id);
        labels.push(profileName.get(r.recipient_profile_id) ?? tDn("chairFallback"));
      } else if (!chairAll) {
        chairAll = true;
        labels.push(tDn("anyChair"));
      }
    }
    return labels.length > 0 ? labels.join(", ") : tDn("toEmpty");
  }

  const notes: HeldDelegationNote[] = rows.map((row) => {
    const senderIsAllocation = Boolean(row.sender_allocation_id);
    const senderLabel = senderIsAllocation
      ? allocationCountry.get(row.sender_allocation_id!) ?? tDn("unknownCountry")
      : profileName.get(row.sender_profile_id ?? "") ?? tDn("chairFallback");

    return {
      id: row.id,
      topic: row.topic,
      content: row.content,
      concern_flag: row.concern_flag,
      hold_reason:
        row.hold_reason === "profanity" ||
        row.hold_reason === "concern_flag" ||
        row.hold_reason === "reported"
          ? row.hold_reason
          : null,
      created_at: row.created_at,
      senderLabel,
      senderIsAllocation,
      recipientSummary: formatRecipients(row.id),
    };
  });

  return (
    <MunPageShell title={t("notesModeration")}>
      <div className="space-y-4">
        <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
          <h2 className="font-display text-lg font-semibold text-brand-navy">{tMod("queueTitle")}</h2>
          <p className="mt-1 text-xs text-brand-muted leading-relaxed">{tMod("queueDescription")}</p>
        </section>
        <DelegationNoteModerationQueue notes={notes} />
      </div>
    </MunPageShell>
  );
}
