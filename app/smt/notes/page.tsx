import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isConferenceEventPlaceholderRow } from "@/lib/awards";
import { loadDelegationNotesBundle } from "@/lib/delegation-notes-bundle";
import { SmtNotesPageClient } from "./SmtNotesPageClient";

export const dynamic = "force-dynamic";

export default async function SmtNotesPage() {
  const t = await getTranslations("smtNotesPage");
  const tDn = await getTranslations("delegationNotes");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eventId = await getActiveEventId();
  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">{t("selectEventFirst")}</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Fnotes"
          className="inline-block rounded-lg bg-brand-paper px-4 py-2 font-medium text-brand-navy hover:bg-brand-navy-soft"
        >
          {t("enterConferenceCode")}
        </Link>
      </div>
    );
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId)
    .order("committee");

  const delegateCommittees = (conferences ?? []).filter((c) => !isConferenceEventPlaceholderRow(c));
  const conferenceIds = delegateCommittees.map((c) => c.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();

  const bundle = await loadDelegationNotesBundle(supabase, {
    conferenceIds,
    userId: user.id,
    userRole: (profile?.role ?? "smt").toString().toLowerCase(),
    myProfileName: profile?.name ?? tDn("chairFallback"),
    chairFallback: tDn("chairFallback"),
    unknownCountry: tDn("unknownCountry"),
    advisorFallback: tDn("advisorFallback"),
    limit: 800,
  });

  const committees = delegateCommittees.map((c) => ({
    id: c.id,
    label: (c.committee ?? c.name ?? t("unknownCommittee")).trim(),
  }));

  return (
    <SmtNotesPageClient
      title={t("title")}
      subtitle={t("subtitle")}
      initialNotes={bundle.notes}
      committees={committees}
      myUserId={user.id}
      myProfileName={profile?.name ?? tDn("chairFallback")}
      myAllocationIds={bundle.myAllocationIds}
      advisorByAllocationId={bundle.advisorByAllocationId}
      advisorNameByProfileId={bundle.advisorNameByProfileId}
    />
  );
}
