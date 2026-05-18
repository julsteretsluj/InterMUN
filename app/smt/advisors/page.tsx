import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isAdminInviteConfigured } from "@/lib/admin-invite-configured";
import { SmtAdvisorsClient } from "./SmtAdvisorsClient";

export const dynamic = "force-dynamic";

export default async function SmtAdvisorsPage() {
  const t = await getTranslations("smtAdvisorsPage");
  const supabase = await createClient();
  const eventId = await getActiveEventId();
  const adminInviteConfigured = isAdminInviteConfigured();

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">{t("selectEventFirst")}</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Fadvisors"
          className="inline-block rounded-lg bg-brand-paper px-4 py-2 font-medium text-brand-navy hover:bg-brand-navy-soft"
        >
          {t("enterConferenceCode")}
        </Link>
      </div>
    );
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("event_id", eventId)
    .order("committee");

  const committeeByConferenceId = new Map((conferences ?? []).map((c) => [c.id, c.committee ?? c.name]));

  const { data: allocations } = await supabase
    .from("allocations")
    .select("id, country, conference_id, user_id")
    .in("conference_id", (conferences ?? []).map((c) => c.id))
    .not("user_id", "is", null)
    .order("country");

  const countryByAllocationId = new Map((allocations ?? []).map((a) => [a.id, a.country]));

  const { data: assignments } = await supabase
    .from("advisor_delegate_assignments")
    .select(
      `
      id,
      delegate_allocation_id,
      advisor_profile_id,
      profiles:advisor_profile_id ( name )
    `
    )
    .in("conference_id", (conferences ?? []).map((c) => c.id));

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-brand-navy">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm text-brand-muted">{t("subtitle")}</p>
      <SmtAdvisorsClient
        adminInviteConfigured={adminInviteConfigured}
        allocationRefs={(allocations ?? []).map((a) => ({
          id: a.id,
          country: a.country,
          committee: committeeByConferenceId.get(a.conference_id) ?? "—",
        }))}
        assignments={(assignments ?? []).map((row) => {
          const profRaw = row.profiles as { name: string | null } | { name: string | null }[] | null;
          const prof = Array.isArray(profRaw) ? profRaw[0] : profRaw;
          return {
            id: row.id,
            allocationId: row.delegate_allocation_id,
            country: countryByAllocationId.get(row.delegate_allocation_id) ?? "—",
            advisorName: prof?.name ?? t("advisorFallback"),
          };
        })}
      />
    </div>
  );
}
