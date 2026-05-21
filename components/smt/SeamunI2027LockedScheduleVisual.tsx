"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  SEAMUN_I_2027_AXIS_END_MIN,
  SEAMUN_I_2027_AXIS_START_MIN,
  type SeamunLockedBlock,
  type SeamunLockedBlockCategory,
  type SeamunLockedColumn,
  timeToMinutes,
} from "@/lib/seamun-i-2027-locked-schedule";
import {
  SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS,
  seamunI2027DebateScheduleGroupId,
  seamunI2027HandbookPdfPath,
  seamunI2027ScheduleGroupForChamber,
  type SeamunScheduleGroupId,
} from "@/lib/seamun-i-2027-committee-groups";
import {
  SEAMUN_ADVISOR_IDS,
  buildSeamunAdvisorDayBlocks,
  buildSeamunCommitteeDayBlocks,
  seamunAllScheduleCommittees,
  seamunDebateColumnsForDay,
  seamunScheduleGroupById,
  seamunScheduleGroupForColumnHeader,
  type SeamunAdvisorId,
} from "@/lib/seamun-i-2027-advisor-schedules";
import { CanteenLeaveNotice } from "@/components/schedule/CanteenLeaveNotice";
import { SeamunLunchOverlapCompare } from "@/components/schedule/SeamunLunchOverlapCompare";

const AXIS_RANGE = SEAMUN_I_2027_AXIS_END_MIN - SEAMUN_I_2027_AXIS_START_MIN;

type BrowseMode = "teams" | "committee" | "advisor";
type TeamsScope = "all" | SeamunScheduleGroupId;

function blockStyle(b: SeamunLockedBlock): { top: string; height: string } {
  const t0 = timeToMinutes(b.start);
  const t1 = timeToMinutes(b.end);
  const top = ((t0 - SEAMUN_I_2027_AXIS_START_MIN) / AXIS_RANGE) * 100;
  const h = ((t1 - t0) / AXIS_RANGE) * 100;
  return { top: `${top}%`, height: `${Math.max(h, 1.1)}%` };
}

function categoryClass(cat: SeamunLockedBlockCategory): string {
  switch (cat) {
    case "arrival_reg":
    case "dismissal":
      return "border-zinc-400/50 bg-zinc-400/25 text-zinc-900 dark:bg-zinc-500/35 dark:text-zinc-50";
    case "sweep":
      return "border-zinc-300/70 bg-white/90 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-100";
    case "ceremony":
      return "border-amber-400/60 bg-amber-300/45 text-amber-950 dark:bg-amber-400/25 dark:text-amber-50";
    case "break_general":
      return "border-pink-300/60 bg-pink-200/55 text-pink-950 dark:bg-pink-500/20 dark:text-pink-50";
    case "session":
      return "border-sky-400/50 bg-sky-200/60 text-sky-950 dark:bg-sky-500/25 dark:text-sky-50";
    case "lunch":
      return "border-emerald-400/50 bg-emerald-200/55 text-emerald-950 dark:bg-emerald-500/22 dark:text-emerald-50";
    case "relax":
      return "border-violet-400/50 bg-violet-200/50 text-violet-950 dark:bg-violet-500/22 dark:text-violet-50";
    case "support":
      return "border-rose-400/60 bg-rose-300/50 text-rose-950 dark:bg-rose-500/28 dark:text-rose-50";
    case "strategy":
      return "border-orange-400/55 bg-orange-200/55 text-orange-950 dark:bg-orange-500/22 dark:text-orange-50";
    default:
      return "border-brand-navy/15 bg-brand-navy/5";
  }
}

const AXIS_TICKS: string[] = (() => {
  const out: string[] = [];
  for (let m = SEAMUN_I_2027_AXIS_START_MIN; m <= SEAMUN_I_2027_AXIS_END_MIN; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return out;
})();

const LEGEND_DEF: { cat: SeamunLockedBlockCategory; msg: string }[] = [
  { cat: "arrival_reg", msg: "legendArrival" },
  { cat: "ceremony", msg: "legendCeremony" },
  { cat: "break_general", msg: "legendBreak" },
  { cat: "session", msg: "legendSession" },
  { cat: "lunch", msg: "legendLunch" },
  { cat: "relax", msg: "legendRelax" },
  { cat: "support", msg: "legendSupport" },
  { cat: "strategy", msg: "legendStrategy" },
  { cat: "dismissal", msg: "legendDismissal" },
  { cat: "sweep", msg: "legendSweep" },
];

function ScheduleColumnBody({ col }: { col: SeamunLockedColumn }) {
  return (
    <div className="relative min-h-[32rem] border-b border-dotted border-brand-navy/10">
      {AXIS_TICKS.map((tick) => {
        const top = ((timeToMinutes(tick) - SEAMUN_I_2027_AXIS_START_MIN) / AXIS_RANGE) * 100;
        return (
          <div
            key={`${col.header}-${tick}`}
            className="pointer-events-none absolute left-0 right-0 border-t border-dotted border-brand-navy/[0.12]"
            style={{ top: `${top}%` }}
          />
        );
      })}
      {col.blocks.map((b) => {
        const st = blockStyle(b);
        return (
          <div
            key={`${b.start}-${b.end}-${b.title}`}
            className={cn(
              "absolute left-0.5 right-0.5 overflow-hidden rounded-md border px-1 py-0.5 shadow-sm",
              categoryClass(b.category)
            )}
            style={{ top: st.top, height: st.height }}
          >
            <p className="text-[0.58rem] font-bold leading-tight sm:text-[0.62rem]">{b.title}</p>
            <p className="mt-0.5 font-mono text-[0.52rem] tabular-nums opacity-80 sm:text-[0.55rem]">
              {b.start}–{b.end}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleGrid({ columns }: { columns: SeamunLockedColumn[] }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-full gap-0">
        <div className="sticky left-0 z-[1] w-14 shrink-0 border-r border-brand-navy/10 bg-brand-paper pr-1 sm:w-16">
          <div className="h-10 border-b border-brand-navy/10" aria-hidden />
          <div className="relative min-h-[32rem]">
            {AXIS_TICKS.map((tick) => {
              const top = ((timeToMinutes(tick) - SEAMUN_I_2027_AXIS_START_MIN) / AXIS_RANGE) * 100;
              return (
                <div
                  key={tick}
                  className="absolute right-0.5 font-mono text-[0.6rem] tabular-nums leading-none text-brand-muted"
                  style={{ top: `calc(${top}% - 0.35rem)` }}
                >
                  {tick}
                </div>
              );
            })}
          </div>
        </div>

        {columns.map((col) => (
          <div
            key={col.header}
            className={cn(
              "border-r border-brand-navy/10 last:border-r-0",
              columns.length === 1 ? "min-w-[12rem] flex-1 max-w-md" : "min-w-[9.5rem] flex-1 sm:min-w-[10.5rem]"
            )}
          >
            <div className="flex h-10 items-end justify-center border-b border-brand-navy/10 px-1 pb-1 text-center text-[0.65rem] font-semibold leading-tight text-brand-navy dark:text-zinc-100">
              {col.header}
            </div>
            <ScheduleColumnBody col={col} />
          </div>
        ))}
      </div>
    </div>
  );
}

export type SeamunScheduleVariant = "smt" | "advisor" | "committee";

export type SeamunI2027LockedScheduleVisualProps = {
  initialGroupId?: SeamunScheduleGroupId | null;
  initialCommittee?: string | null;
  defaultView?: "teams" | "detail";
  variant?: SeamunScheduleVariant;
};

function tabClass(active: boolean) {
  return cn(
    "rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-apple",
    active
      ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
      : "text-brand-muted hover:bg-brand-navy/5"
  );
}

function pillClass(active: boolean) {
  return cn(
    "rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-semibold transition-apple",
    active
      ? "border-brand-accent/50 bg-brand-accent/12 text-brand-navy"
      : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35 hover:text-brand-navy"
  );
}

export function SeamunI2027LockedScheduleVisual({
  initialGroupId = null,
  initialCommittee = null,
  defaultView = "teams",
  variant = "smt",
}: SeamunI2027LockedScheduleVisualProps = {}) {
  const t = useTranslations("smtConferenceSettings.schedule.seamunLocked");
  const tSched = useTranslations("smtConferenceSettings.schedule");

  const isSmt = variant === "smt";
  const isAdvisor = variant === "advisor";
  const isCommittee = variant === "committee";

  const initialCommitteeTrimmed = initialCommittee?.trim() || null;
  const initialGroupFromCommittee = initialCommitteeTrimmed
    ? seamunI2027DebateScheduleGroupId(seamunI2027ScheduleGroupForChamber(initialCommitteeTrimmed))
    : null;

  const initialBrowseMode: BrowseMode = isAdvisor
    ? "advisor"
    : isCommittee
      ? "committee"
      : defaultView === "teams"
        ? "teams"
        : "committee";

  const [day, setDay] = useState<1 | 2>(1);
  const [browseMode, setBrowseMode] = useState<BrowseMode>(initialBrowseMode);
  const [teamsScope, setTeamsScope] = useState<TeamsScope>(
    seamunI2027DebateScheduleGroupId(initialGroupId) ?? initialGroupFromCommittee ?? "all"
  );
  const defaultGroupId =
    seamunI2027DebateScheduleGroupId(initialGroupId) ??
    initialGroupFromCommittee ??
    SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS[0]?.id ??
    null;

  const [groupId, setGroupId] = useState<SeamunScheduleGroupId | null>(defaultGroupId);
  const [advisorId, setAdvisorId] = useState<SeamunAdvisorId | null>(null);
  const [committee, setCommittee] = useState<string | null>(initialCommitteeTrimmed);

  const teamColumns = useMemo(() => seamunDebateColumnsForDay(day), [day]);
  const allCommittees = useMemo(() => seamunAllScheduleCommittees(), []);
  const handbookHref = seamunI2027HandbookPdfPath();

  const displayColumns = useMemo((): SeamunLockedColumn[] => {
    if (browseMode === "teams") {
      if (teamsScope === "all") return teamColumns;
      const col = teamColumns.find((c) => seamunScheduleGroupForColumnHeader(c.header) === teamsScope);
      return col ? [col] : [];
    }

    if (browseMode === "committee" && committee) {
      const blocks = buildSeamunCommitteeDayBlocks(day, committee);
      if (blocks.length === 0) return [];
      return [{ header: committee, blocks }];
    }

    if (browseMode === "advisor" && groupId && advisorId) {
      const def = seamunScheduleGroupById(groupId);
      return [
        {
          header: `${def.scheduleHeader} — Advisor ${advisorId}`,
          blocks: buildSeamunAdvisorDayBlocks(day, groupId, advisorId),
        },
      ];
    }

    return [];
  }, [browseMode, teamsScope, teamColumns, committee, groupId, advisorId, day]);

  function switchBrowseMode(mode: BrowseMode) {
    setBrowseMode(mode);
    if (mode === "teams") {
      setAdvisorId(null);
      setCommittee(null);
    } else if (mode === "committee") {
      setAdvisorId(null);
      setTeamsScope("all");
    } else {
      setCommittee(null);
      setTeamsScope("all");
      if (!groupId && SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS[0]) {
        setGroupId(SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS[0].id);
      }
    }
  }

  function selectTeamsScope(scope: TeamsScope) {
    setBrowseMode("teams");
    setTeamsScope(scope);
    setAdvisorId(null);
    setCommittee(null);
  }

  function selectGroupForAdvisor(id: SeamunScheduleGroupId) {
    setGroupId(id);
    setAdvisorId(null);
  }

  function selectAdvisor(id: SeamunAdvisorId) {
    setAdvisorId(id);
  }

  function selectCommittee(ch: string) {
    setCommittee(ch);
    const g = seamunI2027DebateScheduleGroupId(seamunI2027ScheduleGroupForChamber(ch));
    if (g) setGroupId(g);
  }

  const awaitingSelection =
    (browseMode === "committee" && !committee) ||
    (browseMode === "advisor" && (!groupId || !advisorId));

  const showCommitteePicker = browseMode === "committee" && isSmt;
  const showLockedCommitteeLabel = browseMode === "committee" && isCommittee && committee;

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-navy">{t("title")}</h2>
          <p className="mt-1 text-sm text-brand-muted">{t("body")}</p>
          {isSmt ? <p className="mt-2 text-sm text-brand-navy/90 dark:text-zinc-200">{t("smtBrowseHint")}</p> : null}
          {isAdvisor ? <p className="mt-2 text-sm text-brand-navy/90 dark:text-zinc-200">{t("advisorOnlyHint")}</p> : null}
          {isCommittee ? <p className="mt-2 text-sm text-brand-navy/90 dark:text-zinc-200">{t("committeeOnlyHint")}</p> : null}
          {handbookHref ? (
            <p className="mt-3 text-sm text-brand-navy/90 dark:text-zinc-200">
              <a
                href={handbookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-2 hover:decoration-brand-accent"
              >
                {t("handbookLink")}
              </a>
              <span className="text-brand-muted"> — {t("handbookHint")}</span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1 rounded-[var(--radius-md)] border border-brand-navy/10 bg-white/60 p-0.5 dark:bg-black/25">
          {([1, 2] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDay(d)} className={tabClass(day === d)}>
              {d === 1 ? tSched("day1Tab") : tSched("day2Tab")}
            </button>
          ))}
        </div>
      </div>

      {isSmt ? (
        <div className="mb-4 flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-brand-navy/10 bg-white/60 p-0.5 dark:bg-black/25">
          {(
            [
              ["teams", "browseTeams"],
              ["committee", "browseCommittee"],
              ["advisor", "browseAdvisor"],
            ] as const
          ).map(([mode, labelKey]) => (
            <button
              key={mode}
              type="button"
              onClick={() => switchBrowseMode(mode)}
              className={tabClass(browseMode === mode)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      ) : null}

      {browseMode === "teams" && isSmt ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => selectTeamsScope("all")} className={tabClass(teamsScope === "all")}>
            {t("teamsScopeAll")}
          </button>
          <span className="text-xs text-brand-muted">{t("pickGroup")}</span>
          {SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => selectTeamsScope(g.id)}
              className={pillClass(teamsScope === g.id)}
            >
              {t(`teamShort.${g.id}`)}
            </button>
          ))}
        </div>
      ) : null}

      {browseMode === "committee" && showCommitteePicker ? (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("pickCommitteeAll")}</p>
          <div className="flex flex-wrap gap-2">
            {allCommittees.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => selectCommittee(ch)}
                className={pillClass(committee === ch)}
                aria-pressed={committee === ch}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showLockedCommitteeLabel ? (
        <p className="mb-4 text-sm font-semibold text-brand-navy dark:text-zinc-100">{committee}</p>
      ) : null}

      {browseMode === "advisor" && (isSmt || isAdvisor) ? (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-brand-muted">{t("pickGroup")}</span>
            {SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => selectGroupForAdvisor(g.id)}
                className={pillClass(groupId === g.id)}
              >
                {t(`teamShort.${g.id}`)}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("pickAdvisor")}</p>
            <div className="flex flex-wrap gap-2">
              {SEAMUN_ADVISOR_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectAdvisor(id)}
                  className={cn(
                    "min-w-[2.75rem] rounded-[var(--radius-md)] border px-3 py-2 text-sm font-bold transition-apple",
                    advisorId === id
                      ? "border-brand-accent bg-brand-accent/15 text-brand-navy ring-1 ring-brand-accent/40"
                      : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35"
                  )}
                  aria-pressed={advisorId === id}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("legendTitle")}</p>
      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-[0.65rem] text-brand-navy/90 dark:text-zinc-200">
        {LEGEND_DEF.map(({ cat, msg }) => (
          <span key={cat} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-4 shrink-0 rounded-sm border", categoryClass(cat))} aria-hidden />
            {t(msg)}
          </span>
        ))}
      </div>

      <CanteenLeaveNotice className="mb-5" />

      {awaitingSelection ? (
        <p className="mb-4 rounded-lg border border-dashed border-brand-navy/15 bg-brand-cream/30 px-4 py-6 text-center text-sm text-brand-muted">
          {browseMode === "advisor" ? t("selectAdvisorPrompt") : t("selectCommitteePrompt")}
        </p>
      ) : null}

      {displayColumns.length > 0 && !awaitingSelection ? (
        <ScheduleGrid columns={displayColumns} />
      ) : null}

      {isCommittee && committee ? <SeamunLunchOverlapCompare primaryCommittee={committee} scheduleDay={day} /> : null}
    </div>
  );
}
