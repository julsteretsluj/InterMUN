import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ensureFwcEvidenceLibrary } from "@/app/actions/fwcCrisis";
import { FwcEvidenceLibraryClient } from "@/components/fwc/FwcEvidenceLibraryClient";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChairFwcEvidencePage() {
  const t = await getTranslations("fwcEvidence");
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
  if (!isStaffRole(profile?.role)) redirect("/delegate");

  const activeConf = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!activeConf || !isFwcCommittee(activeConf.committee)) {
    redirect("/chair");
  }

  const loaded = await ensureFwcEvidenceLibrary(activeConf.id);
  if (!loaded.ok) {
    return (
      <MunPageShell title={t("title")} variant="offset">
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#6E6E73]">
          {loaded.error}
        </p>
      </MunPageShell>
    );
  }

  return (
    <MunPageShell title={t("title")} variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">{t("intro")}</p>
      <FwcEvidenceLibraryClient conferenceId={activeConf.id} initial={loaded.data} />
    </MunPageShell>
  );
}
