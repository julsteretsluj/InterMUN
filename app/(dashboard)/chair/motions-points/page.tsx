import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairMotionsPointsLog } from "@/components/chair/ChairMotionsPointsLog";

export default async function ChairMotionsPointsPage() {
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
    <MunPageShell title="Motions & points">
      <div className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Record and star informal motions and points. Start a formal vote from{" "}
          <span className="font-medium text-slate-800 dark:text-zinc-200">Session → Motions</span>.
        </p>
        <ChairMotionsPointsLog conferenceId={conferenceId} />
      </div>
    </MunPageShell>
  );
}
