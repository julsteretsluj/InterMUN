import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isAdvisorRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { getAppName } from "@/lib/branding";
import { DashboardBrandLogos } from "@/components/dashboard/DashboardBrandLogos";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { DashboardAnnouncementPopup } from "@/components/dashboard/DashboardAnnouncementPopup";
import { AdvisorDashboardSidebar, AdvisorMobileDock } from "@/components/dashboard/AdvisorDashboardNav";
import { getTranslations } from "next-intl/server";

export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("advisorLayout");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, profile_picture_url, school")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdvisorRole(profile?.role)) {
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

  const showSeamunLogo = activeEvent?.event_code === "SEAMUNI2027";
  const appName = getAppName();
  const displayName = profile?.name?.trim() || t("defaultDisplayName");
  const schoolLine = profile?.school?.trim() || null;
  const conferenceLine = activeEvent
    ? [activeEvent.name, schoolLine].filter(Boolean).join(" · ")
    : schoolLine;

  return (
    <div className="min-h-screen bg-[var(--desktop-bg)] text-brand-navy lg:p-3">
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-[var(--color-bg-page)] lg:min-h-[calc(100vh-1.5rem)] lg:max-h-screen lg:overflow-hidden lg:rounded-[var(--window-radius)] lg:border lg:border-[var(--hairline)] lg:shadow-[var(--window-shadow)] lg:flex-row">
        <aside className="group relative sticky top-0 z-30 hidden h-screen w-[92px] hover:w-[236px] shrink-0 flex-col overflow-hidden bg-[var(--sidebar-material)] shadow-[inset_-1px_0_0_0_var(--hairline)] backdrop-blur-2xl backdrop-saturate-150 transition-[width] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)] lg:flex">
          <Link
            href="/advisor"
            aria-label={`${appName} home`}
            className="flex shrink-0 items-center justify-center gap-0 border-b border-[var(--hairline)] px-2 py-5 transition [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)] group-hover:justify-start group-hover:gap-3 group-hover:px-5 hover:bg-[color:var(--discord-hover-bg)]"
          >
            <DashboardBrandLogos showConferenceLogo={showSeamunLogo} variant="sidebar" />
            <span className="hidden truncate text-lg font-bold tracking-tight text-brand-accent group-hover:block dark:text-brand-accent-bright">
              {appName}
            </span>
          </Link>
          <div className="flex min-h-0 flex-1 flex-col">
            <AdvisorDashboardSidebar />
          </div>
          <div className="mt-auto shrink-0 space-y-0.5 border-t border-[var(--hairline)] px-3 py-4">
            <Link
              href="/guides"
              className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 text-sm font-medium text-brand-muted transition-apple group-hover:justify-start group-hover:px-3 hover:bg-[color:var(--discord-hover-bg)]"
            >
              <span className="text-base leading-none" aria-hidden>
                ❓
              </span>
              <span className="hidden group-hover:inline">{t("helpCenter")}</span>
            </Link>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--content-material)] backdrop-blur-xl backdrop-saturate-150 lg:min-h-0">
          <DashboardTopBar
            userName={displayName}
            userEmail={user.email ?? ""}
            profilePictureUrl={profile?.profile_picture_url ?? null}
            conferenceLine={conferenceLine}
            showSeamunLogo={showSeamunLogo}
            appName={appName}
            brandHomeHref="/advisor"
            profileHref="/advisor/profile"
          />
          <DashboardAnnouncementPopup />
          {activeEvent ? (
            <div className="border-b border-[var(--hairline)] bg-[var(--material-thick)] px-4 py-2 text-xs text-brand-muted backdrop-blur-xl sm:px-6">
              <div className="w-full">
                {t("activeEvent")}{" "}
                <span className="font-medium text-brand-navy">{activeEvent.name}</span> · {t("code")}{" "}
                <span className="font-mono text-[var(--accent)]">{activeEvent.event_code}</span>
              </div>
            </div>
          ) : (
            <div className="border-b border-[var(--hairline)] bg-[var(--material-thick)] px-4 py-2 text-xs text-[var(--accent)] backdrop-blur-xl sm:px-6">
              <div className="w-full">
                <Link href="/event-gate?next=%2Fadvisor" className="underline hover:no-underline">
                  {t("enterConferenceCodeLink")}
                </Link>{" "}
                {t("loadEventPrompt")}
              </div>
            </div>
          )}
          <main className="w-full flex-1 overflow-y-auto px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 md:py-8 lg:pb-8">
            {children}
          </main>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <AdvisorMobileDock />
      </div>

      <PaperSavedWidget />
    </div>
  );
}
