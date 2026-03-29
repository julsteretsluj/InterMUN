import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairPrepChecklistClient } from "@/components/chair/ChairChecklistClients";

export default async function ChairPrepChecklistPage() {
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
    <MunPageShell title="Prep checklist">
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Before the conference: rules, topic, room, materials, and team. Stored in this browser for this committee;
          reset when prepping a new session.
        </p>
        <ChairPrepChecklistClient conferenceId={conferenceId} />
      </div>
    </MunPageShell>
  );
}
