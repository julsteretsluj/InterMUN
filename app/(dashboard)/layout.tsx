import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "@/components/TabNav";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { ChairLiveFloorThemed } from "@/components/session/ChairLiveFloorThemed";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { getConferenceForDashboard } from "@/lib/active-conference";
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as UserRole | undefined;
  const normalizedRole = role ? (role.toString().trim().toLowerCase() as UserRole) : undefined;
  const showStaffNav = isStaffRole(role);
  // Use the shared role helpers to avoid edge-cases with casing/enum serialization.
  const welcomeTitle = isSmtRole(role)
    ? "Welcome Secretary General"
    : normalizedRole === "chair"
      ? "Welcome Chair"
      : isAdminRole(role)
        ? "Welcome Admin"
        : "Welcome Delegate";

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

  return (
    <div className="flex min-h-screen bg-brand-cream">
      {/* Sidebar: app-style icon rail (desktop) */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[5.5rem] shrink-0 flex-col border-r border-slate-200 bg-white/95 shadow-[4px_0_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-brand-gold/25 dark:bg-brand-paper/95 dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="flex shrink-0 justify-center border-b border-slate-200/90 pb-2 pt-4 dark:border-brand-line/50">
          {showSeamunLogo ? (
            <img
              src="/seamun-i-2027-logo.png"
              alt=""
              className="h-9 w-9 object-contain rounded-xl opacity-95"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-[0.65rem] font-bold text-emerald-800 dark:border-brand-gold/30 dark:bg-brand-gold/20 dark:text-brand-gold-bright"
              aria-hidden
            >
              IM
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <TabNav staffRole={navRole} variant="sidebar" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="border-b border-slate-200 bg-white/95 text-brand-navy shadow-sm dark:border-brand-gold/20 dark:bg-brand-paper dark:shadow-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 pb-4 pt-5">
            <div className="flex items-start gap-4 min-w-0">
              {showSeamunLogo ? (
                <img
                  src="/seamun-i-2027-logo.png"
                  alt="SEAMUN I 2027 logo"
                  className="h-14 w-14 object-contain mt-1 md:hidden shrink-0"
                />
              ) : null}
              <div className="min-w-0">
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-brand-navy">
                  {welcomeTitle}
                </h1>
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm text-brand-navy/90 truncate">{activeConf.name}</p>
                  {[activeConf.committee, activeConf.tagline].filter(Boolean).length > 0 ? (
                    <p className="text-[0.65rem] uppercase tracking-[0.28em] text-emerald-700 dark:text-brand-gold-bright/90">
                      {[activeConf.committee, activeConf.tagline].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {role === "chair" ? (
                    <p className="text-[0.65rem] font-medium text-brand-navy/90 tracking-wide">
                      Dais chair
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          {activeConf?.id && showsDaisTools(role) ? (
            <div className="mx-auto max-w-6xl space-y-2 px-4 pb-4">
              <ChairLiveFloorThemed conferenceId={activeConf.id} />
            </div>
          ) : null}
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-8 pb-[calc(6.85rem+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile: bottom app dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <TabNav staffRole={navRole} variant="dock" />
      </div>

      <PaperSavedWidget />
    </div>
  );
}
