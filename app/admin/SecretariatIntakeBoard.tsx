import { createClient } from "@/lib/supabase/server";
import { SecretariatRegistrationBoard } from "@/components/admin/SecretariatRegistrationBoard";
import { getTranslations } from "next-intl/server";

export default async function SecretariatIntakeBoard() {
  const t = await getTranslations("secretariatRegistration.admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secretariat_registration_requests")
    .select(
      "id, contact_name, contact_email, conference_name, committee_count, delegate_count, chair_count, rop_status, schedule_status, award_criteria_status, matrix_deferred, submitted_at, selected_features"
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  if (error) {
    return (
      <section className="mun-shell !shadow-none space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("title")}</h2>
        <p className="text-sm text-rose-600">{t("loadError")}</p>
      </section>
    );
  }

  return (
    <section className="mun-shell !shadow-none space-y-4">
      <h2 className="font-display text-lg font-semibold text-brand-navy">{t("title")}</h2>
      <p className="max-w-2xl text-sm text-brand-muted">{t("intro")}</p>
      <SecretariatRegistrationBoard rows={data ?? []} />
    </section>
  );
}
