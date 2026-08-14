import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isDaisSeatAllocationCountry } from "@/lib/dais-seat-plan";
import { isRetiredSeamunCommitteeRow } from "@/lib/retired-seamun-committees";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import { SmtDelegatesSearchClient, type SmtDelegateSearchRow } from "./SmtDelegatesSearchClient";

type LinkedProfile = {
  name: string | null;
  role: string | null;
  username: string | null;
  pronouns: string | null;
  school: string | null;
  grade: string | null;
  notes: string | null;
  profile_picture_url: string | null;
};

function unwrapProfile(raw: LinkedProfile | LinkedProfile[] | null | undefined): LinkedProfile | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function isDelegateProfileRole(role: string | null | undefined): boolean {
  return role?.toString().trim().toLowerCase() === "delegate";
}

export const dynamic = "force-dynamic";

export default async function SmtDelegatesPage() {
  const t = await getTranslations("smtDelegatesPage");
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  if (!eventId) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">{t("selectEventFirst")}</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Fdelegates"
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

  const activeConferences = (conferences ?? []).filter((c) => !isRetiredSeamunCommitteeRow(c));
  const activeConferenceIds = activeConferences.map((c) => c.id);
  const committeeByConferenceId = new Map(
    activeConferences.map((c) => [c.id, (c.committee ?? c.name)?.trim() || "Committee"])
  );

  const { data: allocations } =
    activeConferenceIds.length > 0
      ? await supabase
          .from("allocations")
          .select(
            "id, country, conference_id, user_id, display_name_override, profiles:user_id ( name, role, username, pronouns, school, grade, notes, profile_picture_url )"
          )
          .in("conference_id", activeConferenceIds)
          .not("user_id", "is", null)
      : { data: [] as never[] };

  const delegateAllocations = sortRowsByAllocationCountry(
    (allocations ?? []).filter((a) => {
      if (isDaisSeatAllocationCountry(a.country)) return false;
      const profile = unwrapProfile(a.profiles as LinkedProfile | LinkedProfile[] | null);
      return isDelegateProfileRole(profile?.role);
    })
  );

  const userIds = [
    ...new Set(delegateAllocations.map((a) => a.user_id).filter((id): id is string => Boolean(id))),
  ];
  const emailByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const admin = createAdminClient();
    if (admin) {
      const userSet = new Set(userIds);
      for (let page = 1; page <= 5 && emailByUserId.size < userIds.length; page += 1) {
        const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (usersError) break;
        for (const u of usersData.users) {
          if (u.id && u.email && userSet.has(u.id)) emailByUserId.set(u.id, u.email);
        }
        if (usersData.users.length < 1000) break;
      }
    }
  }

  const rows: SmtDelegateSearchRow[] = delegateAllocations.map((a) => {
    const profile = unwrapProfile(a.profiles as LinkedProfile | LinkedProfile[] | null);
    const overrideName = String(a.display_name_override ?? "").trim() || null;
    return {
      allocationId: a.id,
      userId: a.user_id as string,
      country: a.country,
      countryDisplay: a.country,
      committee: committeeByConferenceId.get(a.conference_id) ?? null,
      email: emailByUserId.get(a.user_id as string) ?? null,
      name: profile?.name?.trim() || overrideName,
      username: profile?.username ?? null,
      pronouns: profile?.pronouns ?? null,
      school: profile?.school ?? null,
      grade: profile?.grade ?? null,
      notes: profile?.notes ?? null,
      profilePictureUrl: profile?.profile_picture_url ?? null,
      linkedRole: profile?.role ?? "delegate",
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-sans text-2xl font-bold text-brand-navy">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-muted">{t("intro")}</p>
      </div>
      <SmtDelegatesSearchClient rows={rows} />
    </div>
  );
}
