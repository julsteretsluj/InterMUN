import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeSelector } from "@/components/ThemeSelector";
import { isAdminRole } from "@/lib/roles";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { getActiveEventId } from "@/lib/active-event-cookie";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdminRole(profile?.role)) {
    redirect("/profile");
  }

  const eventId = await getActiveEventId();
  const { data: activeEvent } = eventId
    ? await supabase
        .from("conference_events")
        .select("name, event_code")
        .eq("id", eventId)
        .maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-white/10 dark:bg-brand-paper/95">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="font-display text-lg font-semibold tracking-tight text-brand-navy">Welcome Admin</span>
          <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-3">
            <Link
              href="/admin"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Overview
            </Link>
            <Link
              href="/conference-setup?next=%2Fadmin"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              New conference
            </Link>
            <Link
              href="/smt"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              SMT dashboard
            </Link>
            <Link
              href="/smt/profile"
              className="rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Profile
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <SignOutButton className="text-brand-muted hover:text-brand-diplomatic dark:hover:text-brand-accent-bright" />
          </div>
        </div>
        {activeEvent ? (
          <div className="w-full border-t border-slate-200 px-4 pb-2 pt-2 text-xs text-brand-muted dark:border-white/10">
            Active event: <span className="font-medium text-brand-navy">{activeEvent.name}</span> · code{" "}
            <span className="font-mono text-brand-accent-bright">{activeEvent.event_code}</span>
          </div>
        ) : null}
        <div className="w-full border-t border-slate-200 px-4 pb-2 pt-2 text-xs text-brand-muted dark:border-white/10">
          First admin account is assigned in the database (see migration comments). Never share the service role
          key.
        </div>
      </header>
      <main className="w-full px-4 py-6">{children}</main>
      <PaperSavedWidget />
    </div>
  );
}
