import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { isAdminRole } from "@/lib/roles";

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-display text-lg font-semibold tracking-tight text-white">Site admin</span>
          <nav className="flex flex-wrap items-center gap-1 sm:gap-3 text-sm">
            <Link href="/admin" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Overview
            </Link>
            <Link
              href="/conference-setup?next=%2Fadmin"
              className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors"
            >
              New conference
            </Link>
            <Link href="/smt" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              SMT dashboard
            </Link>
            <Link href="/smt/profile" className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors">
              Profile
            </Link>
          </nav>
          <SignOutButton className="text-slate-300 hover:text-amber-300" />
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 text-xs text-slate-400 border-t border-slate-800 pt-2">
          First admin account is assigned in the database (see migration comments). Never share the service
          role key.
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
