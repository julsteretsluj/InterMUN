import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairFlowChecklistClient } from "@/components/chair/ChairChecklistClients";

export default async function ChairFlowChecklistPage() {
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
  const role = profile?.role?.toString().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    redirect("/profile");
  }

  const conferenceId = await requireActiveConferenceId();

  return (
    <MunPageShell title="📋 Committee flow checklist">
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Normal committee flow — tick steps as you go. Reset when starting a new session or cycle.
        </p>
        <ChairFlowChecklistClient conferenceId={conferenceId} />
      </div>
    </MunPageShell>
  );
}
