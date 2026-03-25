import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "@/components/TabNav";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { Timers } from "@/components/timers/Timers";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { SignOutButton } from "@/components/SignOutButton";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { getResolvedActiveConference } from "@/lib/active-conference";

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

  const role = profile?.role;
  const showChairTools = role === "chair" || role === "smt";

  const chairBypassNoRoom =
    showChairTools &&
    (pathname.startsWith("/chair/") || pathname === "/profile");

  const activeConf = await getResolvedActiveConference();

  if (!activeConf && !chairBypassNoRoom) {
    redirect(`/room-gate?next=${encodeURIComponent(pathname)}`);
  }

  if (!showChairTools && activeConf?.committee_password_hash) {
    const verified = await getVerifiedConferenceId();
    if (verified !== activeConf.id) {
      redirect(`/committee-gate?next=${encodeURIComponent(pathname)}`);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="bg-brand-navy text-brand-paper shadow-md border-b border-brand-gold/20">
        <div className="max-w-6xl mx-auto px-4 pt-5 pb-1 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-brand-paper">
              InterMUN
            </h1>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-brand-gold-bright/90 mt-1">
              Delegate platform
            </p>
          </div>
          <SignOutButton />
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <TabNav showChairTools={showChairTools} />
          {activeConf?.id ? (
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
