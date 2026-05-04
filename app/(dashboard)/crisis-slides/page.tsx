import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { redirect } from "next/navigation";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { GoogleSlidesEmbed } from "@/components/crisis/GoogleSlidesEmbed";
import { getTranslations } from "next-intl/server";

export default async function CrisisSlidesPage() {
  const t = await getTranslations("pageTitles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.role) redirect("/login");

  const myRole = profile.role.toString().toLowerCase();
  const smtSurface = myRole === "smt" ? await getSmtDashboardSurface() : null;
  const effectiveRole = String(
    effectiveDashboardRole(myRole, smtSurface) ?? myRole
  ).toLowerCase();
  const activeConf = await resolveDashboardConferenceForUser(profile.role, user.id);
  if (!activeConf || !isCrisisCommittee(activeConf.committee)) {
    if (effectiveRole === "chair") redirect("/chair");
    if (myRole === "smt" || myRole === "admin") redirect("/smt");
    redirect("/delegate");
  }

  const slidesUrl = activeConf.crisis_slides_url?.trim() || "";
  const committeeLine =
    [activeConf.committee, activeConf.tagline].filter(Boolean).join(" · ") || activeConf.name;

  return (
    <MunPageShell title={t("crisisSlides")}>
      <div className="space-y-4 max-w-4xl">
        <p className="text-sm text-brand-muted">
          Live crisis deck for <span className="font-medium text-brand-navy">{committeeLine}</span>. Secretariat
          sets the Slides link under{" "}
          <Link href="/smt/conference" className="text-brand-accent font-medium hover:underline">
            Event &amp; committee sessions
          </Link>
          .
        </p>

        {!slidesUrl ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-brand-navy dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">No slides linked yet</p>
            <p className="mt-1 text-brand-muted dark:text-amber-200/85">
              Ask SMT to paste your Google Slides URL (Share → anyone with link can view) in the committee session
              form for this topic.
            </p>
          </div>
        ) : (
          <GoogleSlidesEmbed slidesUrl={slidesUrl} heading="Crisis slides" />
        )}
      </div>
    </MunPageShell>
  );
}
