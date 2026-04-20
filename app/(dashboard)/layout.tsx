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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    .select("role, name")
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
  const conferenceLine = [activeConf.committee, activeConf.tagline].filter(Boolean).join(" · ") || activeConf.name;
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
    <div className="flex min-h-screen bg-brand-cream dark:bg-discord-app">
      <aside className="group relative sticky top-0 z-30 hidden h-screen w-[92px] hover:w-[236px] shrink-0 flex-col overflow-hidden border-r border-r-white/10 bg-white/35 backdrop-blur-[20px] shadow-[4px_0_32px_rgba(15,23,42,0.04)] transition-[width] duration-200 dark:border-discord-divider dark:bg-discord-sidebar dark:backdrop-blur-none dark:shadow-none lg:flex">
        <div className="orbit-rail-v pointer-events-none absolute bottom-0 left-0 top-0 z-20 opacity-90" aria-hidden />
        <Link
          href={isChairRole(normalizedRole) ? "/chair" : "/delegate"}
          aria-label={`${appName} home`}
          className="flex shrink-0 items-center justify-center gap-0 border-b border-slate-100 px-2 py-5 transition group-hover:justify-start group-hover:gap-3 group-hover:px-5 hover:bg-slate-50 dark:border-discord-divider dark:hover:bg-[color:var(--discord-hover-bg)]"
        >
          <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="sidebar" />
          <span
            className={
              isChairRole(normalizedRole)
                ? "hidden truncate text-lg font-bold tracking-tight text-slate-700 group-hover:block dark:text-slate-200"
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
          <div className="mt-auto shrink-0 space-y-0.5 border-t border-slate-100 px-3 py-4 dark:border-discord-divider">
            <Link
              href="/guides"
              className="flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-600 transition group-hover:justify-start group-hover:px-3 hover:bg-slate-100 dark:text-discord-muted dark:hover:bg-[color:var(--discord-hover-bg)]"
            >
              <HelpCircle className="h-5 w-5 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span className="hidden group-hover:inline">Help center</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-600 transition group-hover:justify-start group-hover:px-3 hover:bg-slate-100 dark:text-discord-muted dark:hover:bg-[color:var(--discord-hover-bg)]"
            >
              <Settings className="h-5 w-5 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
              <span className="hidden group-hover:inline">Settings</span>
            </Link>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardTopBar
          userName={displayName}
          userEmail={userEmail}
          conferenceLine={conferenceLine || null}
          showSeamunLogo={showSeamunLogo}
          appName={appName}
          brandHomeHref={isChairRole(normalizedRole) ? "/chair" : "/delegate"}
          showDelegateHubLink={false}
          notifications={
            <DashboardNotifications initialUnreadCount={notificationUnreadCount ?? 0} />
          }
        />
        {activeConf?.id && showsDaisTools(role) && sessionIsActive ? (
          <div className="border-b border-slate-200/80 bg-brand-cream px-4 py-3 dark:border-discord-divider dark:bg-discord-app sm:px-6">
            <div className="w-full">
              <ChairLiveFloorThemed
                conferenceId={liveFloorConferenceId ?? activeConf.id}
                canonicalConferenceId={liveFloorCanonicalId ?? activeConf.id}
                siblingConferenceIds={liveFloorSiblings}
              />
            </div>
          </div>
        ) : null}
        <main className="w-full flex-1 px-4 py-6 sm:px-6 md:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {children}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
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
