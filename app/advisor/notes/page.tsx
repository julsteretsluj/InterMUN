import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { isAdvisorRole } from "@/lib/roles";
import { fetchAdvisorAssignmentsForAdvisor } from "@/lib/advisor-access";
import {
  AdvisorNotesTabs,
  type AdvisorForwardedNote,
  type AdvisorLinkedDelegate,
  type AdvisorSentNote,
} from "@/components/advisor/AdvisorNotesTabs";
import { getTranslations } from "next-intl/server";

export default async function AdvisorNotesPage() {
  const t = await getTranslations("pageTitles");
  const tn = await getTranslations("advisorDashboard.notes");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isAdvisorRole(profile?.role)) redirect("/advisor");

  const [forwardedRes, sentRes, assignments] = await Promise.all([
    supabase
      .from("delegation_notes")
      .select("id, topic, content, concern_flag, created_at, forwarded_to_advisor_at")
      .eq("forwarded_to_advisor_profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("delegation_notes")
      .select(
        `
        id,
        topic,
        content,
        created_at,
        moderation_state,
        delegation_note_recipients ( recipient_allocation_id )
      `
      )
      .eq("sender_profile_id", user.id)
      .order("created_at", { ascending: false }),
    fetchAdvisorAssignmentsForAdvisor(supabase, user.id),
  ]);

  const allocationLabel = new Map(
    assignments.map((a) => [a.delegate_allocation_id, a.delegate_name?.trim() || a.delegate_country])
  );
  const allocationUserId = new Map(
    assignments
      .filter((a) => a.delegate_user_id)
      .map((a) => [a.delegate_allocation_id, a.delegate_user_id as string])
  );

  const linkedDelegates: AdvisorLinkedDelegate[] = assignments
    .filter((a): a is typeof a & { delegate_user_id: string } => Boolean(a.delegate_user_id))
    .map((a) => ({
      userId: a.delegate_user_id,
      label: a.delegate_name?.trim() || a.delegate_country,
      country: a.delegate_country,
      committee: a.committee,
    }));

  const forwardedNotes: AdvisorForwardedNote[] = (forwardedRes.data ?? []).map((n) => ({
    id: n.id,
    topic: n.topic,
    content: n.content,
    createdAt: n.created_at,
    forwardedAt: n.forwarded_to_advisor_at,
  }));

  const sentNotes: AdvisorSentNote[] = (sentRes.data ?? [])
    .filter((n) => {
      const recipients = n.delegation_note_recipients ?? [];
      return recipients.some((r) => allocationLabel.has(r.recipient_allocation_id ?? ""));
    })
    .map((n) => {
      const recip = (n.delegation_note_recipients ?? []).find((r) =>
        allocationLabel.has(r.recipient_allocation_id ?? "")
      );
      const allocationId = recip?.recipient_allocation_id ?? "";
      return {
        id: n.id,
        topic: n.topic,
        content: n.content,
        createdAt: n.created_at,
        moderationState: n.moderation_state,
        delegateLabel: allocationLabel.get(allocationId) ?? tn("unknownDelegate"),
        delegateUserId: allocationUserId.get(allocationId) ?? null,
      };
    });

  return (
    <MunPageShell title={t("advisorNotes")}>
      <p className="mb-6 max-w-2xl text-sm text-brand-muted">{tn("intro")}</p>
      <Suspense
        fallback={
          <p className="text-sm text-brand-muted" aria-live="polite">
            {tn("loading")}
          </p>
        }
      >
        <AdvisorNotesTabs
          forwardedNotes={forwardedNotes}
          sentNotes={sentNotes}
          linkedDelegates={linkedDelegates}
        />
      </Suspense>
    </MunPageShell>
  );
}
