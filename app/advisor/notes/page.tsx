import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { isAdvisorRole } from "@/lib/roles";
import { fetchAdvisorAssignmentsForAdvisor } from "@/lib/advisor-access";
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

  const forwarded = forwardedRes.data ?? [];
  const sent = (sentRes.data ?? []).filter((n) => {
    const recipients = n.delegation_note_recipients ?? [];
    return recipients.some((r) => allocationLabel.has(r.recipient_allocation_id ?? ""));
  });

  return (
    <MunPageShell title={t("advisorNotes")}>
      <p className="mb-6 max-w-2xl text-sm text-brand-muted">{tn("intro")}</p>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{tn("forwardedTitle")}</h2>
        {forwarded.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
            {tn("empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {forwarded.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-brand-navy/10 bg-brand-paper px-4 py-3 dark:border-zinc-700"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{n.topic}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy dark:text-zinc-100">{n.content}</p>
                <p className="mt-2 font-mono text-[0.65rem] text-brand-muted">
                  {new Date(n.created_at).toLocaleString()}
                  {n.forwarded_to_advisor_at
                    ? ` · ${tn("forwarded")} ${new Date(n.forwarded_to_advisor_at).toLocaleString()}`
                    : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{tn("sentTitle")}</h2>
        {sent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
            {tn("sentEmpty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {sent.map((n) => {
              const recip = (n.delegation_note_recipients ?? []).find((r) =>
                allocationLabel.has(r.recipient_allocation_id ?? "")
              );
              const allocationId = recip?.recipient_allocation_id ?? "";
              const label = allocationLabel.get(allocationId) ?? tn("unknownDelegate");
              const delegateUserId = allocationUserId.get(allocationId);
              return (
                <li
                  key={n.id}
                  className="rounded-xl border border-brand-navy/10 bg-brand-paper px-4 py-3 dark:border-zinc-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      {tn("toDelegate", { delegate: label })}
                    </p>
                    {delegateUserId ? (
                      <Link
                        href={`/advisor/delegates/${encodeURIComponent(delegateUserId)}/notes`}
                        className="text-xs font-medium text-brand-accent hover:underline"
                      >
                        {tn("openConversation")}
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-brand-muted">{n.topic}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy dark:text-zinc-100">{n.content}</p>
                  <p className="mt-2 font-mono text-[0.65rem] text-brand-muted">
                    {new Date(n.created_at).toLocaleString()}
                    {n.moderation_state === "held" ? ` · ${tn("held")}` : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </MunPageShell>
  );
}
