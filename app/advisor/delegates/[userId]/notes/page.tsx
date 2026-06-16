import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AdvisorSendDelegateNoteForm } from "@/components/advisor/AdvisorSendDelegateNoteForm";
import { AdvisorDelegateNotesList } from "@/components/advisor/AdvisorDelegateNotesList";
import { requireAdvisorDelegateContext } from "@/lib/advisor-delegate-page";
import { getTranslations } from "next-intl/server";

type PageProps = {
  params: Promise<{ userId: string }>;
};

type NoteRow = {
  id: string;
  topic: string;
  content: string;
  created_at: string;
  sender_profile_id: string | null;
  sender_allocation_id: string | null;
  thread_id: string | null;
  moderation_state: string;
  delegation_note_recipients: { recipient_allocation_id: string | null }[] | null;
};

function conversationNotesForDelegate(
  notes: NoteRow[],
  advisorUserId: string,
  delegateAllocationId: string
): NoteRow[] {
  const threadIds = new Set<string>();
  for (const note of notes) {
    const recipients = note.delegation_note_recipients ?? [];
    const toDelegate = recipients.some((r) => r.recipient_allocation_id === delegateAllocationId);
    const fromAdvisor = note.sender_profile_id === advisorUserId && toDelegate;
    const fromDelegate = note.sender_allocation_id === delegateAllocationId;
    if ((fromAdvisor || fromDelegate) && note.thread_id) {
      threadIds.add(note.thread_id);
    }
  }

  return notes
    .filter(
      (note) =>
        (note.thread_id && threadIds.has(note.thread_id)) ||
        (note.sender_profile_id === advisorUserId &&
          (note.delegation_note_recipients ?? []).some(
            (r) => r.recipient_allocation_id === delegateAllocationId
          ))
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export default async function AdvisorDelegateNotesPage({ params }: PageProps) {
  const { userId } = await params;
  const t = await getTranslations("pageTitles");
  const ts = await getTranslations("advisorDashboard.sendNote");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assignment = await requireAdvisorDelegateContext(supabase, user.id, userId);
  const delegateLabel =
    assignment.delegate_name?.trim() || assignment.delegate_country;

  const { data: rawNotes } = await supabase
    .from("delegation_notes")
    .select(
      `
      id,
      topic,
      content,
      created_at,
      sender_profile_id,
      sender_allocation_id,
      thread_id,
      moderation_state,
      delegation_note_recipients ( recipient_allocation_id )
    `
    )
    .eq("conference_id", assignment.conference_id)
    .order("created_at", { ascending: true });

  const notes = conversationNotesForDelegate(
    (rawNotes ?? []) as NoteRow[],
    user.id,
    assignment.delegate_allocation_id
  );

  return (
    <MunPageShell title={t("advisorDelegateNotes")}>
      {!assignment.delegate_user_id ? (
        <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-sm text-brand-muted">
          {ts("delegateNotLinked")}
        </p>
      ) : (
        <div className="space-y-6">
          <AdvisorSendDelegateNoteForm delegateUserId={userId} delegateLabel={delegateLabel} />
          <AdvisorDelegateNotesList
            notes={notes.map((n) => ({
              id: n.id,
              topic: n.topic,
              content: n.content,
              createdAt: n.created_at,
              fromAdvisor: n.sender_profile_id === user.id,
              moderationState: n.moderation_state,
            }))}
            delegateLabel={delegateLabel}
          />
        </div>
      )}
    </MunPageShell>
  );
}
