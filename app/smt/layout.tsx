import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isSmtRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { isRoleOnlyDisplayName, stripRedundantLeadingRole } from "@/lib/utils";
import { getAppName } from "@/lib/branding";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { DashboardAnnouncementPopup } from "@/components/dashboard/DashboardAnnouncementPopup";
import { SmtDashboardSidebar, SmtMobileDock } from "@/components/dashboard/SmtDashboardNav";
import { AppleAppFrame, AppleLayoutWrapper } from "@/components/ui/AppleAppShell";
import { TourShell } from "@/components/tour/TourShell";
import { getTranslations } from "next-intl/server";

export default async function SmtLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("smtLayout");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, profile_picture_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!isSmtRole(profile?.role)) {
    redirect("/profile");
  }

  const eventId = await getActiveEventId();
  const { data: activeEvent } = eventId
    ? await supabase
        .from("conference_events")
        .select("id, name, event_code")
        .eq("id", eventId)
        .maybeSingle()
    : { data: null };

  const rawName = profile?.name?.trim() || "";
  const topBarUserName = isRoleOnlyDisplayName(rawName, "Secretary General")
    ? "Secretary General"
    : stripRedundantLeadingRole(rawName, "Secretary General") || rawName || "SMT";

  const showSeamunLogo = activeEvent?.event_code === "SEAMUNI2027";
  const appName = getAppName();
  const conferenceLine = activeEvent
    ? [activeEvent.name, activeEvent.event_code].filter(Boolean).join(" · ")
    : null;
  const hubLabel = activeEvent?.name?.trim() || t("hubEnterConferenceCode");

  return (
    <AppleAppFrame appName={appName}>
    <TourShell view="smt">
    <div className="min-h-screen bg-[var(--dashboard-cream)] text-brand-navy lg:p-3">
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-[var(--dashboard-card)] lg:min-h-[calc(100vh-1.5rem)] lg:max-h-screen lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--hairline)] lg:shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)]">
      <aside className="group relative sticky top-0 z-30 hidden h-screen w-[92px] shrink-0 flex-col overflow-hidden bg-[color:color-mix(in_srgb,var(--dashboard-cream)_64%,white)] shadow-[inset_-1px_0_0_var(--hairline)] transition-[width] duration-500 ease-[var(--ease-apple)] hover:w-[236px] lg:flex">
        <Link
          href="/smt"
          aria-label={`${appName} home`}
          className="flex shrink-0 items-center justify-center gap-0 overflow-visible border-b border-[var(--hairline)] px-2 py-4 transition [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)] group-hover:justify-start group-hover:gap-3 group-hover:px-4 hover:bg-[color:var(--discord-hover-bg)]"
        >
          <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="sidebar" />
          <span className="hidden truncate text-lg font-bold tracking-tight text-brand-accent group-hover:block dark:text-brand-accent-bright">
            {appName}
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col">
          <SmtDashboardSidebar hubLabel={hubLabel} />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--dashboard-cream)] lg:min-h-0">
        <DashboardTopBar
          userName={topBarUserName}
          userEmail={user.email ?? ""}
          profilePictureUrl={profile?.profile_picture_url ?? null}
          conferenceLine={conferenceLine}
          showSeamunLogo={showSeamunLogo}
          appName={appName}
          brandHomeHref="/smt"
          profileHref="/smt/profile"
        />
        <DashboardAnnouncementPopup />
        {activeEvent ? (
          <div className="border-b border-[var(--hairline)] bg-[var(--dashboard-card)] px-4 py-2 text-xs text-brand-muted sm:px-6">
            <div className="w-full">
              {t("activeEvent")}{" "}
              <span className="font-medium text-brand-navy">{activeEvent.name}</span> · {t("code")}{" "}
              <span className="font-mono text-[var(--accent)]">{activeEvent.event_code}</span>
            </div>
          </div>
        ) : (
          <div className="border-b border-[var(--hairline)] bg-[var(--dashboard-card)] px-4 py-2 text-xs text-[var(--accent)] sm:px-6">
            <div className="w-full">
              <Link href="/event-gate?next=%2Fsmt" className="underline hover:no-underline">
                {t("enterConferenceCodeLink")}
              </Link>{" "}
              {t("loadCommitteesPrompt")}
            </div>
          </div>
        )}
        <main
          data-tour="tour-main"
          className="w-full flex-1 overflow-y-auto px-4 py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-8 md:py-10 lg:pb-10"
        >
          <AppleLayoutWrapper appName={appName} mode="minimal" contentClassName="mx-auto w-full max-w-[var(--content-max-width,82.5rem)] space-y-8">
            {children}
          </AppleLayoutWrapper>
        </main>
      </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <SmtMobileDock />
      </div>

      <PaperSavedWidget />
    </div>
    </TourShell>
    </AppleAppFrame>
  );
}
