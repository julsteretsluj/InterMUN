import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { MunPageShell } from "@/components/MunPageShell";
import { awardCategoryMeta } from "@/lib/awards";
import { DelegateMaterialsExportCard } from "@/components/materials/DelegateMaterialsExportCard";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { sortCountryLabelsForDisplay } from "@/lib/allocation-display-order";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { ProfileAwardsSummaryTabs } from "@/components/profile/ProfileAwardsSummaryTabs";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getLocale, getTranslations } from "next-intl/server";
import { translateAgendaTopicLabel, translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";
import { formatVoteTypeLabel } from "@/lib/i18n/vote-type-label";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { isDelegateDashboardCommitteeAllowlistedEmail } from "@/lib/delegate-dashboard-committee-allowlist";
import { committeeTabKey, getCommitteeAwardScope } from "@/lib/conference-committee-canonical";

type DashboardPickerConferenceRow = {
  id: string;
  name: string;
  committee: string | null;
  committee_code: string | null;
};

type CommitteeLabelTranslator = {
  (key: string, values?: Record<string, string | number | Date>): string;
  has?: (key: string) => boolean;
};

/** One picker entry per chamber: merge topic rows using the same tab key as the allocation matrix / awards. */
function mergeConferenceRowsToCommitteePickerOptions(
  rows: DashboardPickerConferenceRow[],
  opts: {
    activeConferenceId: string | null;
    seatConferenceIdSet: Set<string>;
    tCommitteeLabels: CommitteeLabelTranslator;
    fallbackLabel: string;
  }
): { id: string; label: string }[] {
  const buckets = new Map<string, DashboardPickerConferenceRow[]>();
  for (const r of rows) {
    const k = committeeTabKey(r);
    const arr = buckets.get(k) ?? [];
    arr.push(r);
    buckets.set(k, arr);
  }

  const out: { id: string; label: string }[] = [];
  for (const group of buckets.values()) {
    const sortedGroup = [...group].sort((a, b) => a.name.localeCompare(b.name));
    let chosen = sortedGroup[0]!;
    if (opts.activeConferenceId) {
      const hit = group.find((r) => r.id === opts.activeConferenceId);
      if (hit) chosen = hit;
    } else {
      const seated = group.find((r) => opts.seatConferenceIdSet.has(r.id));
      if (seated) chosen = seated;
    }
    const label =
      translateCommitteeLabel(opts.tCommitteeLabels, chosen.committee).trim() || opts.fallbackLabel;
    out.push({ id: chosen.id, label });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const t = await getTranslations("pageTitles");
  const tp = await getTranslations("profile");
  const tTopics = await getTranslations("agendaTopics");
  const tVoting = await getTranslations("voting");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roleLower = profile?.role?.toString().trim().toLowerCase();
  let smtCommitteeSurface: Awaited<ReturnType<typeof getSmtDashboardSurface>> | null = null;
  if (roleLower === "smt") {
    smtCommitteeSurface = await getSmtDashboardSurface();
    if (smtCommitteeSurface === "secretariat") redirect("/smt");
  }
  if (roleLower === "admin") {
    redirect("/admin");
  }

  const isDelegate =
    roleLower === "delegate" || (roleLower === "smt" && smtCommitteeSurface === "delegate");

  const { data: myAwards } = await supabase
    .from("award_assignments")
    .select("*")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: true });
  /** Delegates must not see pending nominations (chairs may, when readable via RLS). */
  const { data: myPendingNominations } =
    isDelegate
      ? { data: [] as { id: string; nomination_type: string; rank: number; evidence_note: string | null; committee_conference_id: string }[] }
      : await supabase
          .from("award_nominations")
          .select("id, nomination_type, rank, evidence_note, committee_conference_id")
          .eq("nominee_profile_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true });
  const { data: mySeats } = await supabase
    .from("allocations")
    .select("id, conference_id, country")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const seatIds = (mySeats ?? []).map((s) => s.id);
  const { data: myDelegatePoints } =
    seatIds.length > 0
      ? await supabase
          .from("chair_delegate_points")
          .select("id, allocation_id, point_text, created_at, conference_id")
          .in("allocation_id", seatIds)
          .order("created_at", { ascending: false })
      : { data: [] as { id: string; allocation_id: string; point_text: string; created_at: string; conference_id: string }[] };
  const { data: mySpeechNotes } =
    seatIds.length > 0
      ? await supabase
          .from("chair_speech_notes")
          .select("id, allocation_id, speaker_label, content, created_at, conference_id")
          .in("allocation_id", seatIds)
          .order("created_at", { ascending: false })
      : {
          data: [] as {
            id: string;
            allocation_id: string | null;
            speaker_label: string;
            content: string;
            created_at: string;
            conference_id: string;
          }[],
        };
  const { data: myMotions } =
    seatIds.length > 0
      ? await supabase
          .from("vote_items")
          .select("id, title, description, vote_type, procedure_code, created_at, conference_id, motioner_allocation_id")
          .in("motioner_allocation_id", seatIds)
          .order("created_at", { ascending: false })
      : {
          data: [] as {
            id: string;
            title: string | null;
            description: string | null;
            vote_type: string;
            procedure_code: string | null;
            created_at: string;
            conference_id: string;
            motioner_allocation_id: string | null;
          }[],
        };
  const { data: myDiscipline } =
    seatIds.length > 0
      ? await supabase
          .from("chair_delegate_discipline")
          .select(
            "id, allocation_id, conference_id, warning_count, strike_count, voting_rights_lost, speaking_rights_suspended, removed_from_committee, updated_at"
          )
          .in("allocation_id", seatIds)
          .order("updated_at", { ascending: false })
      : {
          data: [] as {
            id: string;
            allocation_id: string;
            conference_id: string;
            warning_count: number;
            strike_count: number;
            voting_rights_lost: boolean;
            speaking_rights_suspended: boolean;
            removed_from_committee: boolean;
            updated_at: string;
          }[],
        };
  const seatById = new Map((mySeats ?? []).map((s) => [s.id, s]));

  const committeeIds = [
    ...new Set(
      [
        ...(myAwards ?? []).map((a) => a.committee_conference_id),
        ...(myPendingNominations ?? []).map((a) => a.committee_conference_id),
        ...(myDelegatePoints ?? []).map((a) => a.conference_id),
        ...(mySpeechNotes ?? []).map((a) => a.conference_id),
        ...(myMotions ?? []).map((a) => a.conference_id),
        ...(myDiscipline ?? []).map((a) => a.conference_id),
      ].filter((id): id is string => Boolean(id))
    ),
  ];
  const { data: awardConfs } =
    committeeIds.length > 0
      ? await supabase
          .from("conferences")
          .select("id, name, committee")
          .in("id", committeeIds)
      : { data: [] as { id: string; name: string; committee: string | null }[] };

  const committeeLabel = Object.fromEntries(
    (awardConfs ?? []).map((c) => [
      c.id,
      translateConferenceHeadline(
        tTopics,
        tCommitteeLabels,
        [c.name, c.committee].filter(Boolean).join(" — "),
        locale
      ),
    ])
  );

  const delegateCommitteeSwitchAllowlisted =
    isDelegateDashboardCommitteeAllowlistedEmail(user.email ?? undefined);
  const canViewPrivate = !isDelegate;
  const activeConference = await resolveDashboardConferenceForUser(roleLower, user.id);
  const activeEventIdFromCookie = await getActiveEventId();
  const crisisReportingEnabled = isCrisisCommittee(activeConference?.committee ?? null);

  const seatConferenceIds = [
    ...new Set((mySeats ?? []).map((s) => s.conference_id).filter(Boolean)),
  ] as string[];

  let rawPickerRows: DashboardPickerConferenceRow[] = [];

  if (seatConferenceIds.length > 0) {
    const { data: seatConfRows } = await supabase
      .from("conferences")
      .select("id, name, committee, committee_code")
      .in("id", seatConferenceIds);
    rawPickerRows = (seatConfRows ?? []) as DashboardPickerConferenceRow[];
  }

  const eventIdForAllowlistPicker =
    activeConference?.event_id ?? activeEventIdFromCookie;
  if (
    isDelegate &&
    delegateCommitteeSwitchAllowlisted &&
    eventIdForAllowlistPicker
  ) {
    const { data: eventConfs } = await supabase
      .from("conferences")
      .select("id, name, committee, committee_code")
      .eq("event_id", eventIdForAllowlistPicker);
    const byId = new Map(rawPickerRows.map((r) => [r.id, r]));
    for (const c of (eventConfs ?? []) as DashboardPickerConferenceRow[]) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
    rawPickerRows = [...byId.values()];
  }

  // Chairs often have dashboard access via the room gate but no linked allocation row; list the whole event.
  if (rawPickerRows.length === 0 && roleLower === "chair" && activeConference?.event_id) {
    const { data: eventConfs } = await supabase
      .from("conferences")
      .select("id, name, committee, committee_code")
      .eq("event_id", activeConference.event_id);
    rawPickerRows = (eventConfs ?? []) as DashboardPickerConferenceRow[];
  }

  if (rawPickerRows.length === 0 && roleLower === "chair" && activeConference?.id) {
    rawPickerRows = [
      {
        id: activeConference.id,
        name: activeConference.name,
        committee: activeConference.committee,
        committee_code: activeConference.committee_code,
      },
    ];
  }

  let dashboardCommitteeSwitch:
    | {
        conferences: { id: string; label: string }[];
        activeConferenceId: string | null;
        confirmBeforeSwitch?: boolean;
        allocationsByConferenceId?: Record<string, { id: string; label: string }[]>;
      }
    | undefined;

  if (rawPickerRows.length > 0) {
    const committeePickerOptions = mergeConferenceRowsToCommitteePickerOptions(rawPickerRows, {
      activeConferenceId: activeConference?.id ?? null,
      seatConferenceIdSet: new Set(seatConferenceIds),
      tCommitteeLabels,
      fallbackLabel: tp("fallbacks.committeeSession"),
    });
    if (committeePickerOptions.length > 0) {
      dashboardCommitteeSwitch = {
        conferences: committeePickerOptions,
        activeConferenceId: activeConference?.id ?? null,
      };
    }
  }

  if (dashboardCommitteeSwitch && delegateCommitteeSwitchAllowlisted) {
    const pickerIds = [...new Set(dashboardCommitteeSwitch.conferences.map((c) => c.id))];
    const scopes = await Promise.all(pickerIds.map((id) => getCommitteeAwardScope(supabase, id)));
    const siblingUnion = [...new Set(scopes.flatMap((s) => s.siblingConferenceIds))];

    const { data: allocRows } =
      siblingUnion.length > 0
        ? await supabase
            .from("allocations")
            .select("id, conference_id, country")
            .in("conference_id", siblingUnion)
            .order("country", { ascending: true })
        : { data: [] as { id: string; conference_id: string; country: string | null }[] };

    const allocationsByConferenceId: Record<string, { id: string; label: string }[]> = {};
    for (let i = 0; i < pickerIds.length; i++) {
      const pickerId = pickerIds[i]!;
      const sib = new Set(scopes[i]!.siblingConferenceIds);
      const rows = (allocRows ?? []).filter((r) => r.conference_id && sib.has(r.conference_id));
      allocationsByConferenceId[pickerId] = rows.map((row) => ({
        id: row.id,
        label: row.country?.trim() || row.id,
      }));
    }

    dashboardCommitteeSwitch = {
      ...dashboardCommitteeSwitch,
      confirmBeforeSwitch: true,
      allocationsByConferenceId,
    };
  }

  const { data: allocationRows } = activeConference?.id
    ? await supabase
        .from("allocations")
        .select("country")
        .eq("conference_id", activeConference.id)
        .order("country", { ascending: true })
    : { data: [] as { country: string }[] };
  const { data: myAllocation } = activeConference?.id
    ? await supabase
        .from("allocations")
        .select("country")
        .eq("conference_id", activeConference.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null as { country?: string | null } | null };

  const availableAllocations = sortCountryLabelsForDisplay([
    ...new Set(
      (allocationRows ?? [])
        .map((row) => row.country?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ]);
  const welcomeCountry = myAllocation?.country?.trim() || profile?.country || tp("fallbacks.yourCountry");
  const welcomeFlag = flagEmojiForCountryName(welcomeCountry);

  const delegateWelcome = isDelegate ? (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-10 shadow-sm">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-brand-navy">
          {tp("delegateWelcome.title", { flag: welcomeFlag, country: welcomeCountry })}
        </h2>
        <p className="mt-3 text-brand-muted">{tp("delegateWelcome.subtitle")}</p>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[
            { href: "/documents", label: tp("delegateWelcome.links.documents") },
            { href: "/chats-notes", label: tp("delegateWelcome.links.notes") },
            { href: "/committee-room", label: tp("delegateWelcome.links.committeeRoom") },
            { href: "/running-notes", label: tp("delegateWelcome.links.runningNotes") },
            { href: "/ideas", label: tp("delegateWelcome.links.ideas") },
            { href: "/guides", label: tp("delegateWelcome.links.guides") },
            { href: "/sources", label: tp("delegateWelcome.links.sources") },
            { href: "/resolutions", label: tp("delegateWelcome.links.resolutions") },
            { href: "/speeches", label: tp("delegateWelcome.links.speeches") },
            { href: "/stances", label: tp("delegateWelcome.links.stances") },
            ...(crisisReportingEnabled
              ? ([
                  { href: "/crisis-slides", label: tp("delegateWelcome.links.crisisSlides") },
                  { href: "/report", label: tp("delegateWelcome.links.report") },
                ] as const)
              : []),
            { href: "/voting", label: tp("delegateWelcome.links.motions") },
            { href: "/voting", label: tp("delegateWelcome.links.points") },
          ].map((item) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className="rounded-lg border border-brand-navy/20 px-3 py-2 text-sm font-medium text-brand-navy bg-black/25 hover:bg-brand-cream transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  ) : null;
  type ProfileTab = "overview" | "awards" | "private" | "settings";
  const showOverviewTab = isDelegate;
  const showAwardsTab = (myAwards?.length ?? 0) > 0 || (myPendingNominations?.length ?? 0) > 0;
  const showPrivateTab =
    isDelegate &&
    ((myDelegatePoints?.length ?? 0) > 0 ||
      (mySpeechNotes?.length ?? 0) > 0 ||
      (myMotions?.length ?? 0) > 0 ||
      (myDiscipline?.length ?? 0) > 0);
  const tabVisibility: Record<ProfileTab, boolean> = {
    overview: showOverviewTab,
    awards: showAwardsTab,
    private: showPrivateTab,
    settings: true,
  };
  const tabOrder: ProfileTab[] = ["overview", "awards", "private", "settings"];
  const visibleTabs = tabOrder.filter((id) => tabVisibility[id]);

  const { tab: tabParam } = await searchParams;
  const requestedTab: ProfileTab =
    tabParam === "awards" || tabParam === "private" || tabParam === "settings"
      ? tabParam
      : "overview";
  if (!tabVisibility[requestedTab]) {
    const fallback = visibleTabs[0] ?? "settings";
    redirect(fallback === "overview" ? "/profile" : `/profile?tab=${fallback}`);
  }
  const activeTab = requestedTab;

  const showOverview = activeTab === "overview";
  const showAwards = activeTab === "awards";
  const showPrivate = activeTab === "private";
  const showSettings = activeTab === "settings";

  return (
    <MunPageShell title={t("profile")}>
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      {visibleTabs.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label={tp("tabs.ariaLabel")}>
          {visibleTabs.map((id) => (
            <Link
              key={id}
              href={id === "overview" ? "/profile" : `/profile?tab=${id}`}
              role="tab"
              aria-selected={activeTab === id}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? "border-brand-accent text-brand-navy bg-brand-paper"
                  : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
              }`}
            >
              {id === "overview"
                ? tp("tabs.overview")
                : id === "awards"
                  ? tp("tabs.awards")
                  : id === "private"
                    ? tp("tabs.private")
                    : tp("tabs.settings")}
            </Link>
          ))}
        </div>
      ) : null}
      {showOverview ? delegateWelcome : null}
      {showOverview && isDelegate ? <DelegateMaterialsExportCard /> : null}
      {showAwards ? (
        <ProfileAwardsSummaryTabs
          pendingSlot={
            (myPendingNominations?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 p-4 md:p-5">
                <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
                  {tp("awards.pending.title")}
                </h3>
                <p className="mb-3 text-xs text-brand-muted">
                  {(myAwards?.length ?? 0) > 0
                    ? tp("awards.pending.descriptionTabbed")
                    : tp("awards.pending.descriptionSingle")}
                </p>
                <ul className="space-y-2 text-sm">
                  {(myPendingNominations ?? []).map((n) => {
                    const category = awardCategoryMeta(n.nomination_type);
                    const where = n.committee_conference_id
                      ? committeeLabel[n.committee_conference_id] ?? tp("fallbacks.committeeSession")
                      : null;
                    return (
                      <li key={n.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                        <span className="font-medium text-brand-navy">
                          {category?.label ?? n.nomination_type}
                        </span>
                        <span className="text-brand-muted"> · {tp("awards.rank", { rank: n.rank })}</span>
                        {where && <span className="text-brand-muted"> · {where}</span>}
                        {n.evidence_note && (
                          <p className="mt-0.5 text-xs text-brand-muted">{n.evidence_note}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null
          }
          recordedSlot={
            (myAwards?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-brand-accent/30 bg-brand-cream/50 p-4 md:p-5">
                <h3 className="font-display text-lg font-semibold text-brand-navy mb-2">
                  {tp("awards.recorded.title")}
                </h3>
                <p className="text-xs text-brand-muted mb-3">
                  {tp("awards.recorded.description")}
                </p>
                <ul className="space-y-2 text-sm">
                  {(myAwards ?? []).map((a) => {
                    const m = awardCategoryMeta(a.category);
                    const where = a.committee_conference_id
                      ? committeeLabel[a.committee_conference_id] ?? tp("fallbacks.committeeSession")
                      : null;
                    return (
                      <li key={a.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                        <span className="font-medium text-brand-navy">{m?.label ?? a.category}</span>
                        {where && (
                          <span className="text-brand-muted"> · {where}</span>
                        )}
                        {a.notes && (
                          <p className="text-xs text-brand-muted mt-0.5">{a.notes}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null
          }
        />
      ) : null}
      {showPrivate && isDelegate && (myDelegatePoints?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-logo-cyan/35 bg-logo-cyan/10 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            {tp("privateSections.points.title")}
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            {tp("privateSections.sharedVisibility")}
          </p>
          <ul className="space-y-2 text-sm">
            {(myDelegatePoints ?? []).map((p) => {
              const where = committeeLabel[p.conference_id] ?? tp("fallbacks.committeeSession");
              const seat = seatById.get(p.allocation_id);
              return (
                <li key={p.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{p.point_text}</span>
                  <span className="text-brand-muted"> · {seat?.country ?? tp("fallbacks.delegate")}</span>
                  <span className="text-brand-muted"> · {where}</span>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {showPrivate && isDelegate && (mySpeechNotes?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-brand-silver/35 bg-brand-silver/10 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            {tp("privateSections.speechNotes.title")}
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            {tp("privateSections.sharedVisibility")}
          </p>
          <ul className="space-y-2 text-sm">
            {(mySpeechNotes ?? []).map((n) => {
              const where = committeeLabel[n.conference_id] ?? tp("fallbacks.committeeSession");
              return (
                <li key={n.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{n.speaker_label || tp("fallbacks.speechNote")}</span>
                  <span className="text-brand-muted"> · {where}</span>
                  <p className="mt-0.5 text-xs text-brand-muted">{n.content}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {showPrivate && isDelegate && (myMotions?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-brand-accent/32 bg-brand-accent/8 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            {tp("privateSections.motions.title")}
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            {tp("privateSections.motions.description")}
          </p>
          <ul className="space-y-2 text-sm">
            {(myMotions ?? []).map((m) => {
              const where = committeeLabel[m.conference_id] ?? tp("fallbacks.committeeSession");
              const title = m.title?.trim()
                ? translateAgendaTopicLabel(tTopics, m.title, locale)
                : m.procedure_code?.replace(/_/g, " ") || tp("fallbacks.untitledMotion");
              return (
                <li key={m.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">{title}</span>
                  <span className="text-brand-muted"> · {where}</span>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {formatVoteTypeLabel(tVoting, m.vote_type)}
                    {m.procedure_code ? ` · ${m.procedure_code.replace(/_/g, " ")}` : ""}
                  </p>
                  {m.description?.trim() ? (
                    <p className="mt-0.5 text-xs text-brand-muted">{m.description.trim()}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {showPrivate && isDelegate && (myDiscipline?.length ?? 0) > 0 && (
        <div className="mb-8 rounded-xl border border-rose-300/40 bg-rose-50/35 p-4 md:p-5">
          <h3 className="mb-2 font-display text-lg font-semibold text-brand-navy">
            {tp("discipline.title")}
          </h3>
          <p className="mb-3 text-xs text-brand-muted">
            {tp("privateSections.sharedVisibility")}
          </p>
          <ul className="space-y-2 text-sm">
            {(myDiscipline ?? []).map((d) => {
              const where = committeeLabel[d.conference_id] ?? tp("fallbacks.committeeSession");
              const seat = seatById.get(d.allocation_id);
              return (
                <li key={d.id} className="border-b border-brand-navy/5 pb-2 last:border-0">
                  <span className="font-medium text-brand-navy">
                    {seat?.country ?? tp("fallbacks.delegate")} · {where}
                  </span>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {tp("discipline.statusLine", {
                      warnings: d.warning_count,
                      strikes: d.strike_count,
                      votingDisabled: d.voting_rights_lost ? ` · ${tp("discipline.votingDisabled")}` : "",
                      speakingSuspended: d.speaking_rights_suspended
                        ? ` · ${tp("discipline.speakingSuspended")}`
                        : "",
                      removedFromCommittee: d.removed_from_committee
                        ? ` · ${tp("discipline.removedFromCommittee")}`
                        : "",
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {tp("discipline.updated", { value: new Date(d.updated_at).toLocaleString() })}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {showSettings ? (
        <ProfileForm
          profile={profile}
          userId={user.id}
          canViewPrivate={!!canViewPrivate}
          availableAllocations={availableAllocations}
          dashboardCommitteeSwitch={dashboardCommitteeSwitch}
        />
      ) : null}
    </MunPageShell>
  );
}
