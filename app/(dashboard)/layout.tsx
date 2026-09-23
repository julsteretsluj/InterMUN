import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCachedDashboardAuth } from "@/lib/dashboard-auth";
import { TabNav } from "@/components/TabNav";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { DeferredChairLiveFloor } from "@/components/session/DeferredChairLiveFloor";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { DashboardAnnouncementPopup } from "@/components/dashboard/DashboardAnnouncementPopup";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { getAllocationCodeVerifiedConferenceId } from "@/lib/allocation-code-gate-cookie";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundleCached } from "@/lib/active-debate-topic";
import { getAppName } from "@/lib/branding";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import {
  ADVISOR_APP_HOME,
  isAdminRole,
  isAdvisorRole,
  isChairRole,
  isStaffRole,
  isSmtRole,
  showsDaisTools,
  SMT_APP_HOME,
  ADMIN_APP_HOME,
} from "@/lib/roles";
import { ChairDashboardSidebar, ChairMobileDock } from "@/components/dashboard/ChairDashboardNav";
import { isCrisisCommittee, isFwcCommittee } from "@/lib/crisis-committee";
import type { UserRole } from "@/types/database";
import { getLocale, getTranslations } from "next-intl/server";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { AppleAppFrame, AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TourShell } from "@/components/tour/TourShell";
import { ChairSessionReminderHost } from "@/components/chair/ChairSessionReminderHost";
import { isSeamunI2027LockedScheduleEvent } from "@/lib/seamun-i-2027-locked-schedule";
import {
  buildSeamunPresetSessionsForCommittee,
  buildSeamunScheduleMilestonesForCommittee,
} from "@/lib/seamun-preset-sessions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, locale, tCommitteeLabels, tTopics, auth, hdrs, smtSurfaceCookie] =
    await Promise.all([
      getTranslations("dashboardLayout"),
      getLocale(),
      getTranslations("committeeNames.labels"),
      getTranslations("agendaTopics"),
      getCachedDashboardAuth(),
      headers(),
      getSmtDashboardSurface(),
    ]);

  const { supabase, user, profile } = auth;

  const pathname = hdrs.get("x-pathname") || "/profile";

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const role = profile?.role as UserRole | undefined;
  const normalizedRole = role ? (role.toString().trim().toLowerCase() as UserRole) : undefined;
  const showStaffNav = isStaffRole(role);
  const smtSurface = isSmtRole(normalizedRole) ? smtSurfaceCookie : null;
  const effectiveRole = (effectiveDashboardRole(normalizedRole, smtSurface) ||
    normalizedRole) as UserRole | undefined;

  if (isAdminRole(normalizedRole)) {
    const search = hdrs.get("x-search") ?? "";
    redirect(`${ADMIN_APP_HOME}${search}`);
  }

  if (isSmtRole(normalizedRole) && smtSurface === "secretariat") {
    const search = hdrs.get("x-search") ?? "";
    redirect(`${SMT_APP_HOME}${search}`);
  }

  if (isAdvisorRole(normalizedRole)) {
    const search = hdrs.get("x-search") ?? "";
    redirect(`${ADVISOR_APP_HOME}${search}`);
  }

  const activeConf = await getConferenceForDashboard({
    role: normalizedRole,
    userId: user.id,
    smtDashboardSurface: isSmtRole(normalizedRole) ? smtSurface : null,
  });

  if (!activeConf) {
    if (isSmtRole(normalizedRole) && smtSurface !== "secretariat") {
      redirect(`/smt/profile?smtBind=1`);
    }
    redirect(`/room-gate?next=${encodeURIComponent(pathname)}`);
  }

  if (!showStaffNav && activeConf?.committee_password_hash) {
    const verified = await getVerifiedConferenceId();
    if (verified !== activeConf.id) {
      redirect(`/committee-gate?next=${encodeURIComponent(pathname)}`);
    }
  }

  const allocationGateOn = activeConf.allocation_code_gate_enabled === true;
  const smtDelegatePreview =
    isSmtRole(normalizedRole) && smtSurface === "delegate";
  const needsAllocationCodeGate =
    allocationGateOn && effectiveRole === "delegate" && !smtDelegatePreview;
  if (needsAllocationCodeGate) {
    const allocVerified = await getAllocationCodeVerifiedConferenceId();
    if (allocVerified !== activeConf.id) {
      redirect(`/allocation-code-gate?next=${encodeURIComponent(pathname)}`);
    }
  }

  const [activeEventResult, debateBundle] = await Promise.all([
    activeConf.event_id
      ? supabase
          .from("conference_events")
          .select("id, event_code")
          .eq("id", activeConf.event_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: string; event_code: string | null } | null }),
    getResolvedDebateConferenceBundleCached(supabase, activeConf.id),
  ]);

  const activeEvent = activeEventResult.data;

  const showSeamunLogo = activeEvent?.event_code === "SEAMUNI2027";
  const seamunScheduleEnabled = isSeamunI2027LockedScheduleEvent(
    activeEvent?.id ?? "",
    activeEvent?.event_code
  );
  /** SMT chair/delegate preview must use the previewed role for chrome, not secretariat staff tabs. */
  const smtCommitteePreview =
    isSmtRole(normalizedRole) && (smtSurface === "chair" || smtSurface === "delegate");
  const navRole = smtCommitteePreview
    ? (effectiveRole ?? null)
    : showStaffNav
      ? role ?? null
      : isAdvisorRole(normalizedRole)
        ? "advisor"
        : null;
  const appName = getAppName();
  const displayName = profile?.name?.trim() || t("defaultDisplayName");
  const userEmail = user.email ?? "";
  const translatedCommittee = activeConf.committee
    ? translateCommitteeLabel(tCommitteeLabels, activeConf.committee)
    : "";
  const translatedTopic = activeConf.name
    ? translateAgendaTopicLabel(tTopics, activeConf.name, locale)
    : "";

  const selectedDebateTopic = debateBundle?.debateTopicOptions.find(
    (topic) => topic.id === debateBundle.debateConferenceId
  );
  const selectedDebateTopicLabel = selectedDebateTopic?.label
    ? translateAgendaTopicLabel(tTopics, selectedDebateTopic.label, locale)
    : "";
  /** Elsewhere: committee + active topic when available, else committee + tagline; fallback to agenda title. */
  const defaultConferenceLine =
    [translatedCommittee, selectedDebateTopicLabel || activeConf.tagline].filter(Boolean).join(" · ") ||
    translatedTopic;
  const profileConferenceLine =
    translatedCommittee.trim() || (activeConf.committee_code?.trim() ?? "");
  const conferenceLine = pathname.startsWith("/profile")
    ? profileConferenceLine
    : defaultConferenceLine;
  const crisisReportingEnabled = isCrisisCommittee(activeConf.committee);
  const fwcCrisisEnabled = isFwcCommittee(activeConf.committee);
  const liveFloorConferenceId = debateBundle?.debateConferenceId ?? activeConf?.id ?? null;
  const liveFloorCanonicalId = debateBundle?.canonicalConferenceId ?? activeConf?.id ?? null;
  const liveFloorSiblings = debateBundle?.siblingConferenceIds ?? (activeConf?.id ? [activeConf.id] : []);

  const tourView = isChairRole(effectiveRole) ? "chair" : "delegate";
  const chairSiblingIds = isChairRole(effectiveRole) ? liveFloorSiblings : null;

  return (
    <AppleAppFrame appName={appName}>
    <TourShell view={tourView}>
    <div className="mun-clicky-site min-h-screen bg-[var(--clicky-paper)] text-[var(--clicky-ink)] lg:p-3">
      <div className="dashboard-app-frame flex min-h-screen w-full min-w-0 flex-col bg-[var(--clicky-window)] lg:min-h-[calc(100vh-1.5rem)] lg:max-h-screen lg:flex-row lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-[var(--clicky-line)]">
      <aside className="group relative sticky top-0 z-30 hidden h-screen w-[92px] shrink-0 flex-col overflow-hidden border-r border-[var(--clicky-line)] bg-[color:color-mix(in_srgb,var(--clicky-paper)_82%,var(--clicky-window))] transition-[width] duration-500 ease-[var(--ease-apple)] hover:w-[236px] lg:flex">
        <Link
          href={
            isChairRole(effectiveRole) ? "/chair" : isAdvisorRole(effectiveRole) ? "/advisor" : "/delegate"
          }
          aria-label={t("appHomeAria", { appName })}
          className="flex shrink-0 items-center justify-center gap-0 overflow-visible border-b border-[var(--hairline)] px-2 py-4 transition [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)] group-hover:justify-start group-hover:gap-3 group-hover:px-4 hover:bg-[color:var(--discord-hover-bg)]"
        >
          <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="sidebar" />
          <span
            className={
              isChairRole(effectiveRole)
                ? "hidden truncate text-lg font-bold tracking-tight text-brand-navy group-hover:block dark:text-zinc-100"
                : "hidden truncate text-lg font-bold tracking-tight text-brand-accent group-hover:block dark:text-brand-accent-bright"
            }
          >
            {appName}
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col">
          {isChairRole(effectiveRole) ? (
            <ChairDashboardSidebar
              conferenceLine={conferenceLine || ""}
              crisisReportingEnabled={crisisReportingEnabled}
              fwcCrisisEnabled={fwcCrisisEnabled}
              pressCorpsProcedure={activeConf.procedure_profile === "press_corps"}
              seamunScheduleEnabled={showSeamunLogo}
              siblingConferenceIds={chairSiblingIds}
            />
          ) : (
            <TabNav
              staffRole={navRole}
              variant="aspire-sidebar"
              crisisReportingEnabled={crisisReportingEnabled}
              fwcCrisisEnabled={fwcCrisisEnabled}
              seamunScheduleEnabled={showSeamunLogo}
            />
          )}
        </div>
        {!isChairRole(effectiveRole) ? (
          <div className="mt-auto shrink-0 space-y-1 border-t border-[var(--hairline)] px-2 py-3 group-hover:px-3">
            <Link
              href="/guides"
              className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>❓</span>
              <span className="hidden group-hover:inline">{t("helpCenter")}</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center text-base leading-none" aria-hidden>⚙️</span>
              <span className="hidden group-hover:inline">{t("settings")}</span>
            </Link>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--clicky-paper)] lg:min-h-0">
        <DashboardTopBar
          userName={displayName}
          userEmail={userEmail}
          profilePictureUrl={profile?.profile_picture_url ?? null}
          conferenceLine={conferenceLine || null}
          showSeamunLogo={showSeamunLogo}
          appName={appName}
          brandHomeHref={isChairRole(effectiveRole) ? "/chair" : "/delegate"}
          showDelegateHubLink={false}
          showExitSmtPreview={isSmtRole(normalizedRole) && smtSurface !== "secretariat"}
          notifications={<DashboardNotifications />}
        />
        <DashboardAnnouncementPopup />
        {isChairRole(effectiveRole) && seamunScheduleEnabled && activeConf.committee ? (
          <ChairSessionReminderHost
            conferenceId={liveFloorCanonicalId ?? activeConf.id}
            presets={buildSeamunPresetSessionsForCommittee(activeConf.committee)}
            milestones={buildSeamunScheduleMilestonesForCommittee(activeConf.committee)}
          />
        ) : null}
        <main
          data-tour="tour-main"
          className="w-full flex-1 overflow-y-auto px-4 py-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-8 md:py-10 lg:pb-10"
        >
          <AppleLayoutWrapper appName={appName} mode="minimal" contentClassName="mx-auto w-full max-w-[var(--content-max-width,82.5rem)] space-y-8">
          {activeConf?.id && showsDaisTools(effectiveRole) ? (
            <GlassPanel
              className="overflow-hidden border-l-[3px] border-l-[color:var(--accent)]"
              material="thin"
              interactive={false}
              dense
            >
              <DeferredChairLiveFloor
                conferenceId={liveFloorConferenceId ?? activeConf.id}
                canonicalConferenceId={liveFloorCanonicalId ?? activeConf.id}
                siblingConferenceIds={liveFloorSiblings}
              />
            </GlassPanel>
          ) : null}
          {children}
        </AppleLayoutWrapper>
        </main>
      </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {isChairRole(effectiveRole) ? (
          <ChairMobileDock
            conferenceLine={conferenceLine || ""}
            crisisReportingEnabled={crisisReportingEnabled}
            fwcCrisisEnabled={fwcCrisisEnabled}
            pressCorpsProcedure={activeConf.procedure_profile === "press_corps"}
            seamunScheduleEnabled={showSeamunLogo}
            siblingConferenceIds={chairSiblingIds}
          />
        ) : (
          <TabNav
            staffRole={navRole}
            variant="dock"
            crisisReportingEnabled={crisisReportingEnabled}
            fwcCrisisEnabled={fwcCrisisEnabled}
            seamunScheduleEnabled={showSeamunLogo}
          />
        )}
      </div>

      <PaperSavedWidget />
    </div>
    </TourShell>
    </AppleAppFrame>
  );
}
