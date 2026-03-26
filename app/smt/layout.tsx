import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isSmtRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";

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
  const secGenName = profile?.name?.trim() || "Jules";
  const welcomeLabel = isJules
    ? `Welcome Secretary General ${secGenName}`
    : "Welcome SMT";
  const showSeamunLogo = activeEvent?.event_code === "SEAMUNI2027";

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <header className="bg-brand-paper text-brand-navy border-b border-brand-navy/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showSeamunLogo ? (
              <img
                src="/seamun-i-2027-logo.png"
                alt="SEAMUN I 2027 logo"
                className="h-10 w-10 object-contain"
              />
            ) : null}
            <span className="font-display text-lg font-semibold tracking-tight">{welcomeLabel}</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-3 text-sm">
            <Link href="/smt" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Live committees
            </Link>
            <Link
              href="/smt/conference"
              className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              Event & committee sessions
            </Link>
            <Link href="/smt/room-codes" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Room codes & chairs
            </Link>
            <Link href="/smt/awards" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Awards
            </Link>
            <Link
              href="/smt/allocation-matrix"
              className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              Allocation matrix
            </Link>
            <Link
              href="/smt/allocation-passwords"
              className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              Allocation passwords
            </Link>
            <Link href="/smt/profile" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Profile
            </Link>
            <Link href="/smt/follow" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Follow
            </Link>
          </nav>
          <SignOutButton className="text-white/90 hover:text-brand-gold-bright" />
        </div>
        {activeEvent ? (
          <div className="max-w-6xl mx-auto px-4 pb-2 text-xs text-brand-muted border-t border-brand-navy/10 pt-2">
            Active event: <span className="text-brand-navy font-medium">{activeEvent.name}</span> · code{" "}
            <span className="font-mono text-brand-gold-bright/90">{activeEvent.event_code}</span>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 pb-2 text-xs text-brand-gold-bright/90 border-t border-brand-navy/10 pt-2">
            <Link href="/event-gate?next=%2Fsmt" className="underline hover:no-underline">
              Enter conference code
            </Link>{" "}
            to load committees for an event.
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <PaperSavedWidget />
    </div>
  );
}
