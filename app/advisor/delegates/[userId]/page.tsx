import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireAdvisorDelegateContext } from "@/lib/advisor-delegate-page";
import { getTranslations } from "next-intl/server";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdvisorDelegateProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const t = await getTranslations("pageTitles");
  const td = await getTranslations("advisorDashboard.delegateProfile");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const assignment = await requireAdvisorDelegateContext(supabase, user.id, userId);

  const { data: delegateProfile } = await supabase
    .from("profiles")
    .select("name, pronouns, school, grade, allocation, conferences_attended, awards")
    .eq("id", userId)
    .maybeSingle();

  const fields = [
    { label: td("fields.name"), value: delegateProfile?.name?.trim() || assignment.delegate_name },
    { label: td("fields.pronouns"), value: delegateProfile?.pronouns?.trim() },
    { label: td("fields.school"), value: delegateProfile?.school?.trim() },
    { label: td("fields.grade"), value: delegateProfile?.grade?.trim() },
    { label: td("fields.country"), value: assignment.delegate_country },
    { label: td("fields.committee"), value: assignment.committee },
  ].filter((f) => f.value);

  return (
    <MunPageShell title={t("advisorDelegateProfile")}>
      {!assignment.delegate_user_id ? (
        <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-sm text-brand-muted">
          {td("notLinked")}
        </p>
      ) : fields.length === 0 ? (
        <p className="text-sm text-brand-muted">{td("empty")}</p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className="rounded-xl border border-brand-navy/10 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/80"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{field.label}</dt>
              <dd className="mt-1 text-sm font-medium text-brand-navy dark:text-zinc-100">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </MunPageShell>
  );
}
