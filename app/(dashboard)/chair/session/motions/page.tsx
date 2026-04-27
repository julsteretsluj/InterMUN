import { MunPageShell } from "@/components/MunPageShell";
import { SessionControlClient } from "../SessionControlClient";
import { loadChairSessionConference } from "../loadChairSession";
import { SessionFloorNoCommittee } from "../SessionFloorNoCommittee";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { localizeCountryName } from "@/lib/i18n/localize-country-name";
import { ChairMotionsPointsLog } from "@/components/chair/ChairMotionsPointsLog";
import { getLocale } from "next-intl/server";

export default async function ChairSessionMotionsPage() {
  const t = await getTranslations("pageTitles");
  const locale = await getLocale();
  const data = await loadChairSessionConference();
  if (!data) {
    return (
      <MunPageShell title={t("formalMotions")}>
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }

  const supabase = await createClient();
  const { data: allocationRows } = await supabase
    .from("allocations")
    .select("id, country, user_id, profiles(name, role)")
    .eq("conference_id", data.conferenceId)
    .not("user_id", "is", null)
    .order("country", { ascending: true });

  const delegateOptions = (allocationRows ?? [])
    .map((r) => {
      const embed = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const roleLower = embed?.role?.toString().trim().toLowerCase();
      if (!r.user_id || roleLower === "chair") return null;
      const name = embed?.name?.trim();
      const localizedCountry = localizeCountryName(r.country, locale) || r.country;
      return {
        allocationId: r.id,
        label: name ? `${localizedCountry} — ${name}` : localizedCountry,
      };
    })
    .filter((row): row is { allocationId: string; label: string } => row != null);

  return (
    <MunPageShell title={t("formalMotions")}>
      <div className="space-y-6">
        <SessionControlClient {...data} activeSection="motions" />
        <section className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
          <ChairMotionsPointsLog conferenceId={data.conferenceId} delegateOptions={delegateOptions} />
        </section>
      </div>
    </MunPageShell>
  );
}
