import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CommitteeGateForm } from "./CommitteeGateForm";
import { StaffNotDelegateBypassForm } from "./StaffNotDelegateBypassForm";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { sortCountryLabelsForDisplay } from "@/lib/allocation-display-order";

export default async function CommitteeGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; allocation?: string }>;
}) {
  const t = await getTranslations("committeeGate");
  const tc = await getTranslations("common");
  const tTopics = await getTranslations("agendaTopics");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const locale = await getLocale();
  const { next: nextRaw, allocation: allocationRaw } = await searchParams;
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/profile";
  const allocationPrefill = String(allocationRaw ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const activeCtx = await getConferenceForDashboard({ role: profile?.role });
  if (!activeCtx?.id) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee, tagline, committee_password_hash")
    .eq("id", activeCtx.id)
    .maybeSingle();

  if (!conference) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}`);
  }

  if (!conference.committee_password_hash) {
    redirect(nextPath);
  }

  const verified = await getVerifiedConferenceId();
  if (verified === conference.id) {
    redirect(nextPath);
  }

  const { data: allocs } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conference.id)
    .eq("user_id", user.id);

  const allocationChoices = sortCountryLabelsForDisplay([
    ...new Set(
      (allocs ?? [])
        .map((a) => a.country?.trim())
        .filter((c): c is string => Boolean(c))
    ),
  ]);
  const preselectedAllocation =
    allocationPrefill.length > 0
      ? allocationChoices.find(
          (choice) => choice.trim().toLowerCase() === allocationPrefill.toLowerCase()
        ) ?? null
      : null;

  const titleRaw = [conference.name, conference.committee, conference.tagline].filter(Boolean).join(" — ");
  const title = translateConferenceHeadline(tTopics, tCommitteeLabels, titleRaw, locale);
  const staffBypass = profile?.role === "smt" || profile?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">{t("title")}</h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            {t.rich("description", {
              alloc: (chunks) => <strong>{chunks}</strong>,
              pwd: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>

          {allocationChoices.length === 0 ? (
            <div className="space-y-5 text-sm text-brand-muted">
              <p>{t("noAllocation")}</p>
              {staffBypass ? (
                <StaffNotDelegateBypassForm conferenceId={conference.id} nextPath={nextPath} />
              ) : profile?.role === "chair" ? (
                <p className="text-xs border border-brand-navy/10 rounded-lg p-3 bg-brand-cream/40">
                  {t.rich("chairHint", {
                    bold: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              ) : null}
              <Link
                href="/room-gate"
                className="inline-block text-brand-accent font-medium hover:underline"
              >
                {t("changeRoomCode")}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <CommitteeGateForm
                conferenceId={conference.id}
                conferenceTitle={title || tc("conference")}
                allocationChoices={allocationChoices}
                initialAllocation={preselectedAllocation}
                nextPath={nextPath}
              />
              {staffBypass ? (
                <>
                  <p className="text-center text-xs text-brand-muted">{t("or")}</p>
                  <StaffNotDelegateBypassForm conferenceId={conference.id} nextPath={nextPath} />
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
