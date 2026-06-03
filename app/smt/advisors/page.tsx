import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isAdminInviteConfigured } from "@/lib/admin-invite-configured";
import { isDaisSeatAllocationCountry } from "@/lib/dais-seat-plan";
import { isRetiredSeamunCommitteeRow } from "@/lib/retired-seamun-committees";
import { SmtAdvisorsClient } from "./SmtAdvisorsClient";

function isDelegateProfileRole(role: string | null | undefined): boolean {
  return role?.toString().trim().toLowerCase() === "delegate";
}

type LinkedProfile = { name: string | null; role: string | null };

function unwrapProfile(
  raw: LinkedProfile | LinkedProfile[] | null | undefined
): LinkedProfile | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

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
    .select("id, name, committee, committee_code, room_code, procedure_profile")
    .eq("event_id", eventId)
    .order("committee");

  const activeConferences = (conferences ?? []).filter((c) => !isRetiredSeamunCommitteeRow(c));

  const activeConferenceIds = activeConferences.map((c) => c.id);
  const committeeByConferenceId = new Map(activeConferences.map((c) => [c.id, c.committee ?? c.name]));

  const { data: allocations } = await supabase
    .from("allocations")
    .select("id, country, conference_id, user_id, profiles:user_id ( name, role )")
    .in("conference_id", activeConferenceIds)
    .not("user_id", "is", null)
    .order("country");

  const delegateAllocations = (allocations ?? []).filter((a) => {
    if (isDaisSeatAllocationCountry(a.country)) return false;
    const profile = unwrapProfile(
      a.profiles as LinkedProfile | LinkedProfile[] | null | undefined
    );
    return isDelegateProfileRole(profile?.role);
  });

  const countryByAllocationId = new Map(delegateAllocations.map((a) => [a.id, a.country]));

  const { data: assignments } = await supabase
    .from("advisor_delegate_assignments")
    .select(
      `
      id,
      delegate_allocation_id,
      advisor_profile_id,
      advisor:advisor_profile_id ( name, role ),
      delegate:delegate_allocation_id (
        country,
        conference_id,
        profiles:user_id ( name, role )
      )
    `
    )
    .in("conference_id", activeConferenceIds);

  const assignmentRows = (assignments ?? [])
    .map((row) => {
      const advisor = unwrapProfile(
        row.advisor as LinkedProfile | LinkedProfile[] | null | undefined
      );
      const delegateRaw = row.delegate as
        | {
            country: string | null;
            conference_id: string;
            profiles: LinkedProfile | LinkedProfile[] | null;
          }
        | {
            country: string | null;
            conference_id: string;
            profiles: LinkedProfile | LinkedProfile[] | null;
          }[]
        | null;
      const delegate = Array.isArray(delegateRaw) ? delegateRaw[0] : delegateRaw;
      const delegateProfile = unwrapProfile(delegate?.profiles);
      if (!delegate || !isDelegateProfileRole(delegateProfile?.role)) return null;

      return {
        id: row.id,
        allocationId: row.delegate_allocation_id,
        country: delegate.country ?? countryByAllocationId.get(row.delegate_allocation_id) ?? "—",
        committee: committeeByConferenceId.get(delegate.conference_id) ?? "—",
        advisorName: advisor?.name ?? t("advisorFallback"),
        delegateName: delegateProfile?.name ?? t("delegateFallback"),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold text-brand-navy">{t("title")}</h1>
      <p className="mb-6 max-w-2xl text-sm text-brand-muted">{t("subtitle")}</p>
      <SmtAdvisorsClient
        adminInviteConfigured={adminInviteConfigured}
        allocationRefs={delegateAllocations.map((a) => {
          const profile = unwrapProfile(
            a.profiles as LinkedProfile | LinkedProfile[] | null | undefined
          );
          return {
            id: a.id,
            country: a.country,
            committee: committeeByConferenceId.get(a.conference_id) ?? "—",
            delegateName: profile?.name ?? t("delegateFallback"),
          };
        })}
        assignments={assignmentRows}
      />
    </div>
  );
}
