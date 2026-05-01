import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { ChairLiveFloor } from "@/components/session/ChairLiveFloor";
import { VirtualCommitteeRoom } from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import {
  resolveCommitteeDisplayTags,
  resolveCommitteeFullName,
} from "@/lib/committee-card-display";
import {
  ageRangeTagClass,
  difficultyTagClass,
  eslFriendlyTagClass,
  formatTagClass,
} from "@/lib/committee-tag-styles";
import { loadCommitteeRoomPayload } from "@/lib/committee-room-payload";
import { SessionHistoryPanel } from "@/components/session/SessionHistoryPanel";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { getLocale, getTranslations } from "next-intl/server";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">{label}</dt>
      <dd className="text-sm text-brand-navy mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default async function SmtCommitteeLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const t = await getTranslations("smtCards");
  const tNames = await getTranslations("committeeNames.full");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const tTopics = await getTranslations("agendaTopics");
  const locale = await getLocale();
  const { id } = await params;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  function localizeKnownCommitteeFullName(value: string | null | undefined): string | null {
    const v = value?.trim();
    if (!v) return null;
    const map: Record<string, string> = {
      "Disarmament and International Security Committee": "DISEC",
      "Economic and Social Council": "ECOSOC",
      "World Health Organization": "WHO",
      "United Nations Security Council": "UNSC",
      "United Nations Human Rights Council": "UNHRC",
      "United Nations Office on Drugs and Crime": "UNODC",
      "UN Women": "UN_WOMEN",
      INTERPOL: "INTERPOL",
      "Press Corps": "PRESS_CORPS",
    };
    const key = map[v];
    return key ? tNames(key) : v;
  }

  const { data: conf } = await supabase
    .from("conferences")
    .select(
      "id, event_id, name, committee, tagline, committee_code, room_code, committee_full_name, chair_names, committee_logo_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (!conf) notFound();

  if (eventId && conf.event_id !== eventId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-brand-navy">
        {t("differentEventWarning")}{" "}
        <Link href="/event-gate?next=%2Fsmt" className="text-brand-accent font-medium underline">
          {t("switchEvent")}
        </Link>{" "}
        or open it from{" "}
        <Link href="/smt" className="text-brand-accent font-medium underline">
          {t("liveCommittees")}
        </Link>
        .
      </div>
    );
  }

  const [roomPayload, resolutionCount, openVotesCount, liveFloorBundle] = await Promise.all([
    loadCommitteeRoomPayload(supabase, conf.id, {
      includeDelegatesForStaff: true,
      chairNamesHint: conf.chair_names,
    }),
    supabase
      .from("resolutions")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", conf.id),
    supabase
      .from("vote_items")
      .select("id", { count: "exact", head: true })
      .eq("conference_id", conf.id)
      .is("closed_at", null),
    getResolvedDebateConferenceBundle(supabase, conf.id),
  ]);

  const { data: chairProfiles } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "chair")
    .order("name");

  const staffAllocs = roomPayload.staffAllocations;
  const totalSeats = staffAllocs.length;
  const filledSeats = staffAllocs.filter((a) => a.user_id).length;

  const displayTitle = (() => {
    const localizedFull = localizeKnownCommitteeFullName(resolveCommitteeFullName(conf.committee_full_name, conf.committee));
    const ac = conf.committee?.trim() || "";
    if (localizedFull && ac) return `${localizedFull} — ${translateCommitteeLabel(tCommitteeLabels, ac)}`;
    if (ac) return translateCommitteeLabel(tCommitteeLabels, ac);
    return t("committeeFallback");
  })();
  const officialName = resolveCommitteeFullName(conf.committee_full_name, conf.committee);
  const displayTags = resolveCommitteeDisplayTags(conf.committee);
  const { tab } = await searchParams;
  const activeTab = tab === "room" || tab === "floor" || tab === "history" ? tab : "overview";

  return (
    <div className="space-y-6">
      <Link href="/smt" className="text-sm text-brand-accent hover:underline inline-block">
        ← {t("allCommittees")}
      </Link>

      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label={t("tabs.ariaLabel")}>
        {[
          { id: "overview", label: t("tabs.overview") },
          { id: "room", label: t("tabs.room") },
          { id: "floor", label: t("tabs.floor") },
          { id: "history", label: t("tabs.history") },
        ].map((item) => (
          <a
            key={item.id}
            href={item.id === "overview" ? `/smt/committees/${id}` : `/smt/committees/${id}?tab=${item.id}`}
            role="tab"
            aria-selected={activeTab === item.id}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === item.id
                ? "border-brand-accent text-brand-navy bg-brand-paper"
                : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5 rounded-xl border border-brand-navy/10 bg-brand-paper p-5 shadow-sm md:p-6">
        <div>
          <div className="flex items-start gap-3.5">
            {conf.committee_logo_url ? (
              <img
                src={conf.committee_logo_url}
                alt={`${conf.committee?.trim()
                  ? translateCommitteeLabel(tCommitteeLabels, conf.committee)
                  : t("committeeFallback")} logo`}
                className="mt-1 h-12 w-12 rounded-md border border-brand-navy/10 bg-white/70 object-contain"
              />
            ) : null}
            <h1 className="font-display text-[1.6rem] font-semibold text-brand-navy">{displayTitle}</h1>
          </div>
          <p className="mt-1.5 text-xs uppercase tracking-wide text-brand-muted">{t("committeeOverview")}</p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem label={t("sessionTopicAgenda")}>
            {conf.name?.trim() ? translateAgendaTopicLabel(tTopics, conf.name, locale) : "—"}
          </MetaItem>
          {conf.tagline?.trim() ? (
            <MetaItem label={t("tagline")}>{conf.tagline}</MetaItem>
          ) : null}
          <MetaItem label={t("officialCommitteeName")}>{localizeKnownCommitteeFullName(officialName) ?? "—"}</MetaItem>
          <MetaItem label={t("chamberAcronym")}>
            {conf.committee?.trim() ? translateCommitteeLabel(tCommitteeLabels, conf.committee) : "—"}
          </MetaItem>
          <MetaItem label={t("difficulty")}>
            {displayTags?.difficulty ? (
              <span className={difficultyTagClass(displayTags.difficulty)}>{displayTags.difficulty}</span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label={t("format")}>
            {displayTags?.format ? (
              <span className={formatTagClass(displayTags.format)}>{displayTags.format}</span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label={t("ageRange")}>
            {displayTags?.ageRange ? (
              <span className={ageRangeTagClass()}>{displayTags.ageRange}</span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label={t("eslFriendly")}>
            {displayTags ? (
              <span className={eslFriendlyTagClass(displayTags.eslFriendly)}>
                {displayTags.eslFriendly ? t("yes") : t("no")}
              </span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label={t("daisListed")}>{conf.chair_names?.trim() || "—"}</MetaItem>
          <MetaItem label={t("committeeCodeSecondGate")}>
            {conf.committee_code?.trim() || conf.room_code?.trim() ? (
              <span className="font-mono tracking-widest">
                {conf.committee_code?.trim() || conf.room_code}
              </span>
            ) : (
              "—"
            )}
          </MetaItem>
          <MetaItem label={t("seats")}>
            {t("seatsFilledAllocated", { filled: filledSeats, total: totalSeats })}
          </MetaItem>
          <MetaItem label={t("resolutions")}>{resolutionCount.count ?? 0}</MetaItem>
          <MetaItem label={t("openVotes")}>{openVotesCount.count ?? 0}</MetaItem>
        </dl>

        <p className="text-xs text-brand-muted border-t border-brand-navy/10 pt-4">
          {t("editMetadataIntro")}{" "}
          <Link href="/smt/conference" className="text-brand-accent font-medium hover:underline">
            {t("eventSessionsLink")}
          </Link>
          {t("codesUnder")}{" "}
          <Link href="/smt/room-codes" className="text-brand-accent font-medium hover:underline">
            {t("roomCodesChairsLink")}
          </Link>
          .
        </p>
      </div>
      ) : null}

      {activeTab === "room" ? (
      <section className="space-y-3.5 rounded-xl border border-brand-navy/10 bg-brand-paper p-5 shadow-sm md:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">{t("digitalCommitteeRoom")}</h2>
        <p className="text-sm text-brand-navy/90 max-w-2xl">
          {t("digitalRoomDescription")}
        </p>
        <VirtualCommitteeRoom
          conferenceName={
            conf.name ? translateAgendaTopicLabel(tTopics, conf.name, locale) : t("conferenceFallback")
          }
          committeeName={
            conf.committee?.trim()
              ? translateCommitteeLabel(tCommitteeLabels, conf.committee)
              : t("committeeFallback")
          }
          placards={roomPayload.placards}
          dais={roomPayload.dais}
          helperText={t("helperTextSmtPreview")}
        />
        <CommitteeRoomStaffControls
          allocations={roomPayload.staffAllocations}
          delegates={roomPayload.delegates}
          chairs={(chairProfiles ?? []).map((c) => ({ id: c.id, name: c.name ?? null }))}
          staffRole="smt"
        />
      </section>
      ) : null}

      {activeTab === "floor" ? (
      <div className="space-y-6 rounded-xl border border-brand-navy/10 bg-brand-paper p-5 shadow-sm md:p-6">
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">{t("liveFloor")}</h2>
          <ChairLiveFloor
            conferenceId={liveFloorBundle.debateConferenceId}
            canonicalConferenceId={liveFloorBundle.canonicalConferenceId}
            siblingConferenceIds={liveFloorBundle.siblingConferenceIds}
            theme="light"
            observeFloorOnly
          />
        </section>

        <p className="text-xs text-brand-muted pt-2 border-t border-brand-navy/10">
          {t("liveFloorDescription")}
        </p>
      </div>
      ) : null}

      {activeTab === "history" ? <SessionHistoryPanel conferenceId={conf.id} /> : null}
    </div>
  );
}
