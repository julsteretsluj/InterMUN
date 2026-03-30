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
    <MunPageShell title="📜 Motions & Points">
      <div className="space-y-2">
        <ChairMotionsPointsLog conferenceId={conferenceId} />
      </div>
    </MunPageShell>
  );
}
