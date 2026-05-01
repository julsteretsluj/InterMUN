import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairPrepChecklistClient } from "@/components/chair/ChairChecklistClients";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { getTranslations } from "next-intl/server";

export default async function ChairPrepChecklistPage() {
  const t = await getTranslations("pageTitles");
  const tChecklist = await getTranslations("chairChecklists.prepPage");
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
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee")
    .eq("id", conferenceId)
    .maybeSingle();
  const crisisPrepEnabled = isCrisisCommittee(conf?.committee ?? null);

  return (
    <MunPageShell title={t("prepChecklist")}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {tChecklist("description")}
          {!crisisPrepEnabled ? ` ${tChecklist("crisisHidden")}` : null}
        </p>
        <ChairPrepChecklistClient conferenceId={conferenceId} crisisPrepEnabled={crisisPrepEnabled} />
      </div>
    </MunPageShell>
  );
}
