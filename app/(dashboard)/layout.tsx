import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TabNav } from "@/components/TabNav";
import { PaperSavedWidget } from "@/components/PaperSavedWidget";
import { Timers } from "@/components/timers/Timers";
import { SignOutButton } from "@/components/SignOutButton";

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold">InterMUN</h1>
          <SignOutButton />
        </div>
        <TabNav />
        <Timers />
      </header>
      <main className="p-4 max-w-6xl mx-auto">{children}</main>
      <PaperSavedWidget />
    </div>
  );
}
