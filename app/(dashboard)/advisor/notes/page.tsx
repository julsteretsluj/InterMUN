import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { isAdvisorRole } from "@/lib/roles";
import { getChamberScope } from "@/lib/chamber-scope";
import { getTranslations } from "next-intl/server";

export default async function AdvisorForwardedNotesPage() {
  const t = await getTranslations("pageTitles");
  const tn = await getTranslations("advisorDashboard.notes");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isAdvisorRole(profile?.role)) redirect("/profile");

  const conferenceId = await requireActiveConferenceId();
  const scope = await getChamberScope(supabase, conferenceId);

  const { data: notes } = await supabase
    .from("delegation_notes")
    .select("id, topic, content, concern_flag, created_at, forwarded_to_advisor_at")
    .eq("forwarded_to_advisor_profile_id", user.id)
    .in("conference_id", scope.siblingConferenceIds)
    .order("created_at", { ascending: false });

  return (
    <MunPageShell title={t("advisorNotes")}>
      <p className="mb-4 max-w-2xl text-sm text-brand-muted">{tn("intro")}</p>
      {(notes ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
          {tn("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {(notes ?? []).map((n) => (
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
    </MunPageShell>
  );
}
