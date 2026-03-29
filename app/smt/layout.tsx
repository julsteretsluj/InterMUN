import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <header className="border-b border-slate-200 bg-white/95 text-brand-navy dark:border-white/10 dark:bg-brand-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
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
          <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-3">
            <Link href="/smt" className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
              Live committees
            </Link>
            <Link
              href="/smt/conference"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Event & committee sessions
            </Link>
            <Link
              href="/smt/room-codes"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Room codes & chairs
            </Link>
            <Link
              href="/smt/awards"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Awards
            </Link>
            <Link
              href="/smt/allocation-matrix"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Allocation matrix
            </Link>
            <Link
              href="/smt/allocation-passwords"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Allocation passwords
            </Link>
            <Link
              href="/smt/profile"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Profile
            </Link>
            <Link
              href="/smt/follow"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Follow
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton className="text-brand-navy hover:text-emerald-700 dark:hover:text-brand-gold-bright" />
          </div>
        </div>
        {activeEvent ? (
          <div className="mx-auto max-w-6xl border-t border-slate-200 px-4 pb-2 pt-2 text-xs text-brand-muted dark:border-white/10">
            Active event: <span className="text-brand-navy font-medium">{activeEvent.name}</span> · code{" "}
            <span className="font-mono text-brand-gold-bright/90">{activeEvent.event_code}</span>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl border-t border-slate-200 px-4 pb-2 pt-2 text-xs text-emerald-700 dark:border-white/10 dark:text-brand-gold-bright/90">
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
