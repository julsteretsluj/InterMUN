import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { HelpCircle, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "@/components/TabNav";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { ChairLiveFloorThemed } from "@/components/session/ChairLiveFloorThemed";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { DashboardAnnouncementPopup } from "@/components/dashboard/DashboardAnnouncementPopup";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { getAllocationCodeVerifiedConferenceId } from "@/lib/allocation-code-gate-cookie";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { getAppName } from "@/lib/branding";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import {
  isAdminRole,
  isChairRole,
  isStaffRole,
  isSmtRole,
  showsDaisTools,
  SMT_APP_HOME,
  ADMIN_APP_HOME,
} from "@/lib/roles";
import { ChairDashboardSidebar, ChairMobileDock } from "@/components/dashboard/ChairDashboardNav";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import type { UserRole } from "@/types/database";
import { getTranslations } from "next-intl/server";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("dashboardLayout");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const tTopics = await getTranslations("agendaTopics");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "/profile";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, profile_picture_url")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as UserRole | undefined;
  const normalizedRole = role ? (role.toString().trim().toLowerCase() as UserRole) : undefined;
  const showStaffNav = isStaffRole(role);

  if (isAdminRole(normalizedRole)) {
    const search = hdrs.get("x-search") ?? "";
    redirect(`${ADMIN_APP_HOME}${search}`);
  }

  if (isSmtRole(normalizedRole)) {
    const search = hdrs.get("x-search") ?? "";
    redirect(`${SMT_APP_HOME}${search}`);
  }

  const activeConf = await getConferenceForDashboard({ role: normalizedRole });

  if (!activeConf) {
    redirect(`/room-gate?next=${encodeURIComponent(pathname)}`);
  }

  if (!showStaffNav && activeConf?.committee_password_hash) {
    const verified = await getVerifiedConferenceId();
    if (verified !== activeConf.id) {
      redirect(`/committee-gate?next=${encodeURIComponent(pathname)}`);
    }
  }

  const allocationGateOn = activeConf.allocation_code_gate_enabled === true;
  const needsAllocationCodeGate = allocationGateOn && normalizedRole === "delegate";
  if (needsAllocationCodeGate) {
    const allocVerified = await getAllocationCodeVerifiedConferenceId();
    if (allocVerified !== activeConf.id) {
      redirect(`/allocation-code-gate?next=${encodeURIComponent(pathname)}`);
    }
  }

  const { data: activeEvent } = activeConf?.event_id
    ? await supabase
        .from("conference_events")
        .select("event_code")
        .eq("id", activeConf.event_id)
        .maybeSingle()
    : { data: null };

  const showSeamunLogo = activeEvent?.event_code === "SEAMUNI2027";
  const navRole = showStaffNav ? role ?? null : null;
  const appName = getAppName();
  const displayName = profile?.name?.trim() || "Delegate";
  const userEmail = user.email ?? "";
  const translatedCommittee = activeConf.committee
    ? translateCommitteeLabel(tCommitteeLabels, activeConf.committee)
    : "";
  const translatedTopic = activeConf.name ? translateAgendaTopicLabel(tTopics, activeConf.name) : "";
  const conferenceLine = [translatedCommittee, activeConf.tagline].filter(Boolean).join(" · ") || translatedTopic;
  const crisisReportingEnabled = isCrisisCommittee(activeConf.committee);

  const { count: notificationUnreadCount } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  const debateBundle = activeConf?.id
    ? await getResolvedDebateConferenceBundle(supabase, activeConf.id)
    : null;
  const sessionProcedureConferenceId =
    debateBundle?.canonicalConferenceId ?? activeConf?.id ?? null;
  const liveFloorConferenceId = debateBundle?.debateConferenceId ?? activeConf?.id ?? null;
  const liveFloorCanonicalId = debateBundle?.canonicalConferenceId ?? activeConf?.id ?? null;
  const liveFloorSiblings = debateBundle?.siblingConferenceIds ?? (activeConf?.id ? [activeConf.id] : []);

  const { data: procedureState, error: procedureStateError } = sessionProcedureConferenceId
    ? await supabase
        .from("procedure_states")
        .select("committee_session_started_at")
        .eq("conference_id", sessionProcedureConferenceId)
        .maybeSingle()
    : { data: null };
  const startedAtColumnMissing =
    /schema cache/i.test(String(procedureStateError?.message ?? "")) &&
    /committee_session_started_at/i.test(String(procedureStateError?.message ?? ""));
  const sessionIsActive = !startedAtColumnMissing && Boolean(
    (procedureState as { committee_session_started_at?: string | null } | null)
      ?.committee_session_started_at
  );

  return (
    <div className="min-h-screen bg-[var(--desktop-bg)] lg:p-3">
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-[var(--color-bg-page)] lg:min-h-[calc(100vh-1.5rem)] lg:max-h-screen lg:overflow-hidden lg:rounded-[var(--window-radius)] lg:border lg:border-[var(--hairline)] lg:shadow-[var(--window-shadow)] lg:flex-row">
      <aside className="group relative sticky top-0 z-30 hidden h-screen w-[92px] hover:w-[236px] shrink-0 flex-col overflow-hidden bg-[var(--sidebar-material)] shadow-[inset_-1px_0_0_0_var(--hairline)] backdrop-blur-2xl backdrop-saturate-150 transition-[width] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)] lg:flex">
        <Link
          href={isChairRole(normalizedRole) ? "/chair" : "/delegate"}
          aria-label={`${appName} home`}
          className="flex shrink-0 items-center justify-center gap-0 border-b border-[var(--hairline)] px-2 py-5 transition [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)] group-hover:justify-start group-hover:gap-3 group-hover:px-5 hover:bg-[color:var(--discord-hover-bg)]"
        >
          <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="sidebar" />
          <span
            className={
              isChairRole(normalizedRole)
                ? "hidden truncate text-lg font-bold tracking-tight text-brand-navy group-hover:block dark:text-zinc-100"
                : "hidden truncate text-lg font-bold tracking-tight text-brand-accent group-hover:block dark:text-brand-accent-bright"
            }
          >
            {appName}
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col">
          {isChairRole(normalizedRole) ? (
            <ChairDashboardSidebar
              conferenceLine={conferenceLine || ""}
              crisisReportingEnabled={crisisReportingEnabled}
            />
          ) : (
            <TabNav
              staffRole={navRole}
              variant="aspire-sidebar"
              crisisReportingEnabled={crisisReportingEnabled}
            />
          )}
        </div>
        {!isChairRole(normalizedRole) ? (
          <div className="mt-auto shrink-0 space-y-0.5 border-t border-[var(--hairline)] px-3 py-4">
            <Link
              href="/guides"
              className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
            >
              <HelpCircle className="h-5 w-5 text-brand-muted" strokeWidth={1.75} />
              <span className="hidden group-hover:inline">{t("helpCenter")}</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
            >
              <Settings className="h-5 w-5 text-brand-muted" strokeWidth={1.75} />
              <span className="hidden group-hover:inline">{t("settings")}</span>
            </Link>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--content-material)] backdrop-blur-xl backdrop-saturate-150">
        <DashboardTopBar
          userName={displayName}
          userEmail={userEmail}
          profilePictureUrl={profile?.profile_picture_url ?? null}
          conferenceLine={conferenceLine || null}
          showSeamunLogo={showSeamunLogo}
          appName={appName}
          brandHomeHref={isChairRole(normalizedRole) ? "/chair" : "/delegate"}
          showDelegateHubLink={false}
          notifications={
            <DashboardNotifications initialUnreadCount={notificationUnreadCount ?? 0} />
          }
        />
        <DashboardAnnouncementPopup />
        {activeConf?.id && showsDaisTools(role) && sessionIsActive ? (
          <div className="border-y border-[var(--hairline)] bg-[var(--material-thick)] px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="w-full">
              <ChairLiveFloorThemed
                conferenceId={liveFloorConferenceId ?? activeConf.id}
                canonicalConferenceId={liveFloorCanonicalId ?? activeConf.id}
                siblingConferenceIds={liveFloorSiblings}
              />
            </div>
          </div>
        ) : null}
        <main className="w-full flex-1 px-4 py-6 sm:px-6 md:py-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {children}
        </main>
      </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {isChairRole(normalizedRole) ? (
          <ChairMobileDock
            conferenceLine={conferenceLine || ""}
            crisisReportingEnabled={crisisReportingEnabled}
          />
        ) : (
          <TabNav staffRole={navRole} variant="dock" crisisReportingEnabled={crisisReportingEnabled} />
        )}
      </div>

      <PaperSavedWidget />
    </div>
  );
}
