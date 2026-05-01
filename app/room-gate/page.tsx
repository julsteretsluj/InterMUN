import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { RoomGateForm } from "./RoomGateForm";
import { SwitchCommitteeButton } from "./SwitchCommitteeButton";
import { SwitchConferenceButton } from "./SwitchConferenceButton";
import { AutoJoinSingleton } from "./AutoJoinSingleton";
import { getResolvedActiveConference } from "@/lib/active-conference";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { staffContinueWithLatestConference } from "@/app/actions/roomGate";
import {
  canCreateConferenceEvent,
  canUseLatestCommitteeShortcut,
  isStaffRole,
} from "@/lib/roles";
import { SMT_COMMITTEE_CODE } from "@/lib/join-codes";
import { getLocale, getTranslations } from "next-intl/server";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";

export default async function RoomGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const t = await getTranslations("roomGate");
  const tTopics = await getTranslations("agendaTopics");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const locale = await getLocale();
  const { next: nextRaw, e: errCode } = await searchParams;
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/profile";

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

  const role = profile?.role;
  const showStaffTools = isStaffRole(role);
  const showLatestShortcut = canUseLatestCommitteeShortcut(role);
  const showConferenceSetup = canCreateConferenceEvent(role);

  const { count: eventCount } = await supabase
    .from("conference_events")
    .select("*", { count: "exact", head: true });
  const { count: conferenceCount } = await supabase
    .from("conferences")
    .select("*", { count: "exact", head: true });

  if ((eventCount ?? 0) === 1 && (conferenceCount ?? 0) === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
        <div className="relative w-full max-w-md space-y-8">
          <BrandWordmark />
          <AutoJoinSingleton nextPath={nextPath} />
        </div>
      </div>
    );
  }

  if (!(await getActiveEventId())) {
    redirect(`/event-gate?next=${encodeURIComponent(nextPath)}`);
  }

  const existing = await getResolvedActiveConference();
  if (existing?.id) {
    const existingLabel = translateConferenceHeadline(
      tTopics,
      tCommitteeLabels,
      [existing.name, existing.committee, existing.tagline].filter(Boolean).join(" — "),
      locale
    );
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
        <div className="relative w-full max-w-md space-y-8">
          <BrandWordmark />
          <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10 space-y-4">
            <h1 className="font-display text-xl font-semibold text-brand-navy text-center">
              {t("alreadyInCommittee")}
            </h1>
            <p className="text-sm text-brand-muted text-center">
              {t("youAreSetTo")}{" "}
              <strong className="text-brand-navy">
                {existingLabel}
              </strong>
              .
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={nextPath}
                className="block text-center py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
              >
                {t("continueToPlatform")}
              </Link>
              <SwitchCommitteeButton nextPath={nextPath} />
              <SwitchConferenceButton nextPath={nextPath} />
              {showConferenceSetup ? (
                <Link
                  href={`/conference-setup?next=${encodeURIComponent(nextPath)}`}
                  className="block text-center text-sm text-brand-navy font-medium border border-brand-navy/20 rounded-lg py-2.5 hover:bg-brand-cream/60"
                >
                  {t("setupConferenceSmt")}
                </Link>
              ) : null}
              <Link
                href="/profile"
                className="block text-center text-sm text-brand-accent hover:underline py-2"
              >
                {t("goToProfile")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const staffErrMsg =
    errCode === "no-conferences"
      ? t("staffErrNoConferences")
      : errCode === "not-staff"
        ? t("staffErrNotStaff")
      : errCode === "latest-smt-only"
        ? t("staffErrLatestSmtOnly")
        : errCode === "create-forbidden"
          ? t("staffErrCreateForbidden")
          : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            {t("joinCommittee")}
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            {t("joinCommitteeDescription")}
          </p>
          <p className="text-xs text-brand-muted text-center mb-4">
            <Link href={`/event-gate?next=${encodeURIComponent(nextPath)}`} className="text-brand-accent hover:underline">
              {t("wrongConference")}
            </Link>
          </p>
          {staffErrMsg && (
            <p
              className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4"
              role="alert"
            >
              {staffErrMsg}
            </p>
          )}
          {showLatestShortcut && (
            <form action={staffContinueWithLatestConference} className="mb-4">
              <input type="hidden" name="next" value={nextPath} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg border-2 border-brand-accent text-brand-navy font-medium hover:bg-brand-cream/80 transition-colors"
              >
                {t("openLatestCommittee")}
              </button>
              <p className="text-xs text-brand-muted text-center mt-2">
                {t("openLatestCommitteeHelp", { code: SMT_COMMITTEE_CODE })}
              </p>
            </form>
          )}
          {showConferenceSetup && (
            <div className="mb-6 rounded-xl border border-brand-navy/15 bg-brand-cream/50 p-4">
              <Link
                href={`/conference-setup?next=${encodeURIComponent(nextPath)}`}
                className="block text-center text-sm font-semibold text-brand-navy hover:text-brand-accent transition-colors"
              >
                {t("setupConferenceSmtOnly")}
              </Link>
              <p className="text-xs text-brand-muted text-center mt-2 leading-relaxed">
                {t("setupConferenceHelp")}
              </p>
            </div>
          )}
          <RoomGateForm nextPath={nextPath} showStaffTools={showStaffTools} />
        </div>
      </div>
    </div>
  );
}
