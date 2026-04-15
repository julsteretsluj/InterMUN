import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isSmtRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { isRoleOnlyDisplayName, stripRedundantLeadingRole } from "@/lib/utils";
import { getAppName } from "@/lib/branding";
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
    <div className="flex min-h-screen bg-[#f4f6fb] text-slate-900 dark:bg-zinc-950 dark:text-zinc-50">
      <aside className="group sticky top-0 z-30 hidden h-screen w-[92px] hover:w-[236px] shrink-0 flex-col overflow-hidden border-r border-r-white/10 bg-white/20 backdrop-blur-[20px] shadow-[4px_0_32px_rgba(15,23,42,0.04)] transition-[width] duration-200 dark:border-white/10 dark:bg-zinc-950/60 dark:shadow-none lg:flex">
        <Link
          href="/smt"
          className="flex shrink-0 items-center justify-center gap-0 border-b border-slate-100 px-2 py-5 transition group-hover:justify-start group-hover:gap-3 group-hover:px-5 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900/80"
        >
          {showSeamunLogo ? (
            <img
              src="/seamun-i-2027-logo.png"
              alt=""
              className="h-10 w-10 shrink-0 rounded-2xl object-contain"
            />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-xs font-bold text-white shadow-md"
              aria-hidden
            >
              IM
            </span>
          )}
          <span className="hidden truncate text-lg font-bold tracking-tight text-emerald-800 group-hover:block dark:text-emerald-200">
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
          <div className="border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-2 text-xs text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:px-6">
            <div className="mx-auto max-w-[1400px]">
              Active event: <span className="font-medium text-slate-800 dark:text-zinc-100">{activeEvent.name}</span>{" "}
              · code <span className="font-mono text-emerald-700 dark:text-emerald-400/90">{activeEvent.event_code}</span>
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-2 text-xs text-emerald-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-emerald-300/90 sm:px-6">
            <div className="mx-auto max-w-[1400px]">
              <Link href="/event-gate?next=%2Fsmt" className="underline hover:no-underline">
                Enter conference code
              </Link>{" "}
              to load committees for an event.
            </div>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 md:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
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
