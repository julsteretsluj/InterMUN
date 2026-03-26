import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "@/components/TabNav";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { Timers } from "@/components/timers/Timers";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { SignOutButton } from "@/components/SignOutButton";
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

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-brand-paper text-brand-navy shadow-md border-b border-brand-gold/20">
        <div className="max-w-6xl mx-auto px-4 pt-5 pb-1 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {showSeamunLogo ? (
              <img
                src="/seamun-i-2027-logo.png"
                alt="SEAMUN I 2027 logo"
                className="h-14 w-14 object-contain mt-1"
              />
            ) : null}
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-brand-navy">
                {welcomeTitle}
              </h1>
              <div className="mt-1 space-y-0.5">
                <p className="text-sm text-brand-navy/90">{activeConf.name}</p>
                {[activeConf.committee, activeConf.tagline].filter(Boolean).length > 0 ? (
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-brand-gold-bright/90">
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
          <SignOutButton />
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <TabNav staffRole={showStaffNav ? role ?? null : null} />
          {activeConf?.id && showsDaisTools(role) ? (
            <>
              <div className="mt-3">
                <Timers conferenceId={activeConf.id} />
              </div>
              <div className="mt-2">
                <FloorStatusBar conferenceId={activeConf.id} />
              </div>
            </>
          ) : null}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">{children}</main>
      <PaperSavedWidget />
    </div>
  );
}
