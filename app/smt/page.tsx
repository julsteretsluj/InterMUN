import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { SMT_COMMITTEE_CODE } from "@/lib/join-codes";
import { formatCommitteeCardTitle, resolveCommitteeDisplayTags, resolveCommitteeFullName } from "@/lib/committee-card-display";
import {
  ageRangeTagClass,
  difficultyTagClass,
  eslFriendlyTagClass,
  formatTagClass,
} from "@/lib/committee-tag-styles";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { getTranslations } from "next-intl/server";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";

function difficultySortRank(level: "Beginner" | "Intermediate" | "Advanced" | null | undefined) {
  if (level === "Beginner") return 0;
  if (level === "Intermediate") return 1;
  if (level === "Advanced") return 2;
  return 99;
}

export default async function SmtOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e: overviewErr } = await searchParams;
  const t = await getTranslations("smtOverview");
  const tNames = await getTranslations("committeeNames.full");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const tTopics = await getTranslations("agendaTopics");
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

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">{t("noEventSelected")}</p>
        <Link
          href="/event-gate?next=%2Fsmt"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          {t("enterConferenceCode")}
        </Link>
      </div>
    );
  }

  const { data: committees } = await supabase
    .from("conferences")
    .select(
      "id, name, committee, tagline, committee_code, committee_full_name, chair_names, committee_logo_url, created_at"
    )
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const rows = (committees ?? []).filter((c) => {
    const code = c.committee_code?.trim().toUpperCase() ?? "";
    const committeeLabel = c.committee?.trim() ?? "";
    const fullName = c.committee_full_name?.trim() ?? "";
    const hasRealCommitteeLabel =
      committeeLabel.length > 0 &&
      committeeLabel.toLowerCase() !== "committee" &&
      fullName.toLowerCase() !== "committee";
    return code !== SMT_COMMITTEE_CODE && hasRealCommitteeLabel;
  });

  type Row = (typeof rows)[number];

  const groups = new Map<
    string,
    { latestId: string; latestRow: Row; topicCount: number; topics: string[] }
  >();

  for (const r of rows) {
    const localizedFull = localizeKnownCommitteeFullName(
      resolveCommitteeFullName(r.committee_full_name, r.committee)
    );
    const committeeCode = r.committee?.trim() || "";
    const groupLabel = (localizedFull && committeeCode
      ? `${localizedFull} — ${committeeCode}`
      : formatCommitteeCardTitle(r.committee_full_name, r.committee)).trim();
    if (!groupLabel || groupLabel.toLowerCase() === "committee") continue;
    const key = groupLabel.toLowerCase();

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        latestId: r.id,
        latestRow: r,
        topicCount: 1,
        topics: r.name?.trim() ? [r.name.trim()] : [],
      });
      continue;
    }

    const existingTime = existing.latestRow.created_at
      ? new Date(existing.latestRow.created_at).getTime()
      : 0;
    const nextTime = r.created_at ? new Date(r.created_at).getTime() : 0;
    const latestRow = nextTime > existingTime ? r : existing.latestRow;

    groups.set(key, {
      ...existing,
      latestId: latestRow.id,
      latestRow,
      topicCount: existing.topicCount + 1,
      topics:
        r.name?.trim() && !existing.topics.includes(r.name.trim())
          ? [...existing.topics, r.name.trim()]
          : existing.topics,
    });
  }

  const list = Array.from(groups.values()).sort((a, b) => {
    const aDifficulty = resolveCommitteeDisplayTags(a.latestRow.committee)?.difficulty;
    const bDifficulty = resolveCommitteeDisplayTags(b.latestRow.committee)?.difficulty;
    const difficultyDelta = difficultySortRank(aDifficulty) - difficultySortRank(bDifficulty);
    if (difficultyDelta !== 0) return difficultyDelta;

    const aTitle = (
      localizeKnownCommitteeFullName(resolveCommitteeFullName(a.latestRow.committee_full_name, a.latestRow.committee)) &&
      a.latestRow.committee?.trim()
        ? `${localizeKnownCommitteeFullName(resolveCommitteeFullName(a.latestRow.committee_full_name, a.latestRow.committee))} — ${a.latestRow.committee?.trim()}`
        : formatCommitteeCardTitle(a.latestRow.committee_full_name, a.latestRow.committee)
    ).toLowerCase();
    const bTitle = (
      localizeKnownCommitteeFullName(resolveCommitteeFullName(b.latestRow.committee_full_name, b.latestRow.committee)) &&
      b.latestRow.committee?.trim()
        ? `${localizeKnownCommitteeFullName(resolveCommitteeFullName(b.latestRow.committee_full_name, b.latestRow.committee))} — ${b.latestRow.committee?.trim()}`
        : formatCommitteeCardTitle(b.latestRow.committee_full_name, b.latestRow.committee)
    ).toLowerCase();
    return aTitle.localeCompare(bTitle);
  });

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-brand-muted text-sm">
        {t("noCommittees")}{" "}
        <Link href="/smt/conference" className="text-brand-gold font-medium hover:underline">
          {t("eventSessionsLink")}
        </Link>{" "}
        {t("orSupabase")}
      </div>
    );
  }

  return (
    <div>
      {overviewErr === "smt-no-session-floor" && (
        <div
          className="mb-6 rounded-lg border border-brand-gold/40 bg-brand-cream/60 px-4 py-3 text-sm text-brand-navy"
          role="status"
        >
          {t.rich("sessionFloorBanner", {
            floor: (chunks) => <strong>{chunks}</strong>,
            chairs: (chunks) => <strong>{chunks}</strong>,
            live: (chunks) => <strong>{chunks}</strong>,
          })}
        </div>
      )}
      <h1 className="font-display text-3xl font-semibold text-brand-navy mb-2">{t("welcomeSg")}</h1>
      <p className="text-base text-brand-navy mb-6">{t("whichCommittee")}</p>
      <div className="mb-6">
        <RoleSetupChecklist role="smt" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <Link
            key={g.latestId}
            href={`/smt/committees/${g.latestId}`}
            className="rounded-xl border border-brand-navy/15 bg-brand-paper px-4 py-3 text-brand-navy shadow-sm hover:bg-brand-cream transition-colors"
          >
            {g.latestRow.committee_logo_url ? (
              <img
                src={g.latestRow.committee_logo_url}
                alt={t("committeeLogoAlt", {
                  name: g.latestRow.committee
                    ? translateCommitteeLabel(tCommitteeLabels, g.latestRow.committee)
                    : "Committee",
                })}
                className="h-10 w-10 object-contain rounded-md bg-white/60 border border-brand-navy/10 mb-2"
              />
            ) : null}
            <p className="font-semibold text-sm leading-snug">
              {(() => {
                const localizedFull = localizeKnownCommitteeFullName(
                  resolveCommitteeFullName(g.latestRow.committee_full_name, g.latestRow.committee)
                );
                const code = g.latestRow.committee?.trim() || "";
                if (localizedFull && code) return `${localizedFull} — ${translateCommitteeLabel(tCommitteeLabels, code)}`;
                return translateCommitteeLabel(
                  tCommitteeLabels,
                  formatCommitteeCardTitle(g.latestRow.committee_full_name, g.latestRow.committee)
                );
              })()}
            </p>
            {(() => {
              const tags = resolveCommitteeDisplayTags(g.latestRow.committee);
              if (!tags) return null;
              return (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={difficultyTagClass(tags.difficulty)}>{tags.difficulty}</span>
                  <span className={formatTagClass(tags.format)}>{tags.format}</span>
                  <span className={ageRangeTagClass()}>{tags.ageRange}</span>
                  {tags.eslFriendly ? (
                    <span className={eslFriendlyTagClass(true)}>{t("eslFriendly")}</span>
                  ) : null}
                </div>
              );
            })()}
            {g.latestRow.chair_names?.trim() ? (
              <p className="text-xs text-brand-muted mt-2">
                <span className="font-medium text-brand-navy/80">{t("chairsLabel")} </span>
                {g.latestRow.chair_names.trim()}
              </p>
            ) : null}
            {g.latestRow.committee_code?.trim() ? (
              <p className="text-xs font-mono text-brand-navy/70 mt-2 tracking-widest">
                {g.latestRow.committee_code.trim().toUpperCase()}
              </p>
            ) : null}
            {g.topicCount > 1 ? (
              <p className="text-[0.72rem] text-brand-navy/85 mt-1 font-medium">
                {t("sessionsCount", { count: g.topicCount })}
              </p>
            ) : null}
            {g.topics.length > 0 ? (
              <div className="mt-2 space-y-1">
                {g.topics.slice(0, 2).map((topic) => (
                  <p key={topic} className="text-[0.72rem] text-brand-navy/90 leading-snug">
                    <span className="font-semibold text-brand-navy">{t("topicLabel")}</span>{" "}
                    {translateAgendaTopicLabel(tTopics, topic)}
                  </p>
                ))}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
