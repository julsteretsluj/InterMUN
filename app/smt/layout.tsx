import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isSmtRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { isRoleOnlyDisplayName, stripRedundantLeadingRole } from "@/lib/utils";
import { getAppName } from "@/lib/branding";
import { InterMunEmblem } from "@/components/InterMunEmblem";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { SmtDashboardSidebar, SmtMobileDock } from "@/components/dashboard/SmtDashboardNav";

export default async function SmtLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
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

  const email = user.email?.toLowerCase().trim();
  const isJules = email === "juleskittoastrop@gmail.com";
  const rawSecGenName = profile?.name?.trim() || "Jules";
  const secGenDisplayName = stripRedundantLeadingRole(rawSecGenName, "Secretary General");
  const topBarUserName = isJules
    ? isRoleOnlyDisplayName(rawSecGenName, "Secretary General")
      ? "Secretary General"
      : secGenDisplayName
    : profile?.name?.trim() || "SMT";

  const showSeamunLogo = activeEvent?.event_code === "SEAMUNI2027";
  const appName = getAppName();
  const conferenceLine = activeEvent
    ? [activeEvent.name, activeEvent.event_code].filter(Boolean).join(" · ")
    : null;
  const hubLabel = activeEvent?.name?.trim() || "Enter conference code";

  return (
    <div className="flex min-h-screen bg-brand-cream text-brand-navy dark:bg-discord-app dark:text-zinc-50">
      <aside className="group relative sticky top-0 z-30 hidden h-screen w-[92px] hover:w-[236px] shrink-0 flex-col overflow-hidden border-r border-r-white/10 bg-white/35 backdrop-blur-[20px] shadow-[4px_0_32px_rgba(18,18,18,0.06)] transition-[width] duration-200 dark:border-discord-divider dark:bg-discord-sidebar dark:backdrop-blur-none dark:shadow-none lg:flex">
        <div className="orbit-rail-v pointer-events-none absolute bottom-0 left-0 top-0 z-20 opacity-90" aria-hidden />
        <Link
          href="/smt"
          className="flex shrink-0 items-center justify-center gap-0 border-b border-slate-100 px-2 py-5 transition group-hover:justify-start group-hover:gap-3 group-hover:px-5 hover:bg-slate-50 dark:border-discord-divider dark:hover:bg-[color:var(--discord-hover-bg)]"
        >
          {showSeamunLogo ? (
            <img
              src="/seamun-i-2027-logo.png"
              alt=""
              className="h-10 w-10 shrink-0 rounded-2xl object-contain"
            />
          ) : (
            <InterMunEmblem alt="" className="h-10 w-10 rounded-2xl" />
          )}
          <span className="hidden truncate text-lg font-bold tracking-tight text-brand-accent group-hover:block dark:text-brand-accent-bright">
            {appName}
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col">
          <SmtDashboardSidebar hubLabel={hubLabel} />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardTopBar
          userName={topBarUserName}
          userEmail={user.email ?? ""}
          conferenceLine={conferenceLine}
          showSeamunLogo={showSeamunLogo}
          appName={appName}
          brandHomeHref="/smt"
          profileHref="/smt/profile"
        />
        {activeEvent ? (
          <div className="border-b border-slate-200/80 bg-brand-cream px-4 py-2 text-xs text-slate-600 dark:border-discord-divider dark:bg-discord-app dark:text-discord-muted sm:px-6">
            <div className="w-full">
              Active event: <span className="font-medium text-slate-800 dark:text-zinc-100">{activeEvent.name}</span>{" "}
              · code{" "}
              <span className="font-mono text-discord-blurple dark:text-[#949cfa]">{activeEvent.event_code}</span>
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-200/80 bg-brand-cream px-4 py-2 text-xs text-brand-accent dark:border-discord-divider dark:bg-discord-app dark:text-brand-accent-bright sm:px-6">
            <div className="w-full">
              <Link href="/event-gate?next=%2Fsmt" className="underline hover:no-underline">
                Enter conference code
              </Link>{" "}
              to load committees for an event.
            </div>
          </div>
        )}
        <main className="w-full flex-1 px-4 py-6 sm:px-6 md:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {children}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <SmtMobileDock />
      </div>

      <PaperSavedWidget />
    </div>
  );
}
