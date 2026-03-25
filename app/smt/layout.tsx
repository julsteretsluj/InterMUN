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
  const welcomeLabel = isJules ? `Welcome Sec Gen ${secGenName}` : "Welcome SMT";

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <header className="bg-slate-900 text-white border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold tracking-tight">{welcomeLabel}</span>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-3 text-sm">
            <Link href="/smt" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Live committees
            </Link>
            <Link
              href="/smt/conference"
              className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              Conference & committees
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
          <SignOutButton className="text-white/90 hover:text-amber-200" />
        </div>
        {activeEvent ? (
          <div className="max-w-6xl mx-auto px-4 pb-2 text-xs text-slate-300 border-t border-slate-800 pt-2">
            Active event: <span className="text-white font-medium">{activeEvent.name}</span> · code{" "}
            <span className="font-mono text-amber-200/90">{activeEvent.event_code}</span>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 pb-2 text-xs text-amber-200/90 border-t border-slate-800 pt-2">
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
