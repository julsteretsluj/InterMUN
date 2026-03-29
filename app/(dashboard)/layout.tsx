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
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getAppName } from "@/lib/branding";
import { isAdminRole, isStaffRole, isSmtRole, showsDaisTools, SMT_APP_HOME, ADMIN_APP_HOME } from "@/lib/roles";
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

  const { count: notificationUnreadCount } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="flex min-h-screen bg-[#f4f6fb] dark:bg-zinc-950">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-[4px_0_32px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none lg:flex">
        <Link
          href="/profile"
          className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-5 transition hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900/80"
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
          <span className="truncate text-lg font-bold tracking-tight text-violet-800 dark:text-violet-200">
            {appName}
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col">
          <TabNav staffRole={navRole} variant="aspire-sidebar" />
        </div>
        <div className="mt-auto shrink-0 space-y-0.5 border-t border-slate-100 px-3 py-4 dark:border-zinc-800">
          <Link
            href="/guides"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
          >
            <HelpCircle className="h-5 w-5 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
            Help center
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
          >
            <Settings className="h-5 w-5 text-slate-400 dark:text-zinc-500" strokeWidth={1.75} />
            Settings
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardTopBar
          userName={displayName}
          userEmail={userEmail}
          conferenceLine={conferenceLine || null}
          showSeamunLogo={showSeamunLogo}
          appName={appName}
          notifications={
            <DashboardNotifications initialUnreadCount={notificationUnreadCount ?? 0} />
          }
        />
        {activeConf?.id && showsDaisTools(role) ? (
          <div className="border-b border-slate-200/80 bg-[#f4f6fb] px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
            <div className="mx-auto max-w-[1400px]">
              <ChairLiveFloorThemed conferenceId={activeConf.id} />
            </div>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 md:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {children}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <TabNav staffRole={navRole} variant="dock" />
      </div>

      <PaperSavedWidget />
    </div>
  );
}
