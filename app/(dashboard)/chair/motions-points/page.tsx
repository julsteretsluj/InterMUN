import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairMotionsPointsLog } from "@/components/chair/ChairMotionsPointsLog";
import { localizeCountryName } from "@/lib/i18n/localize-country-name";
import { getLocale, getTranslations } from "next-intl/server";

export default async function ChairMotionsPointsPage() {
  const t = await getTranslations("pageTitles");
  const locale = await getLocale();
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
  const { data: allocationRows } = await supabase
    .from("allocations")
    .select("id, country, user_id, profiles(name, role)")
    .eq("conference_id", conferenceId)
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
    <MunPageShell title={t("pointsLog")}>
      <div className="space-y-2">
        <ChairMotionsPointsLog conferenceId={conferenceId} delegateOptions={delegateOptions} />
      </div>
    </MunPageShell>
  );
}
