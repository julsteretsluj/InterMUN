"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  SEAMUN_I_2027_AXIS_END_MIN,
  SEAMUN_I_2027_AXIS_START_MIN,
  SEAMUN_I_2027_DAY1_COLUMNS,
  SEAMUN_I_2027_DAY2_COLUMNS,
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
  seamunScheduleGroupById,
  type SeamunAdvisorId,
} from "@/lib/seamun-i-2027-advisor-schedules";
import { SeamunLunchOverlapCompare } from "@/components/schedule/SeamunLunchOverlapCompare";

const AXIS_RANGE = SEAMUN_I_2027_AXIS_END_MIN - SEAMUN_I_2027_AXIS_START_MIN;

type DetailMode = "advisor" | "committee";

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

function ScheduleGrid({
  columns,
  onColumnHeaderClick,
}: {
  columns: SeamunLockedColumn[];
  onColumnHeaderClick?: (groupId: SeamunScheduleGroupId) => void;
}) {
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

        {columns.map((col) => {
          const groupDef = SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.find((g) => g.scheduleHeader === col.header);
          const clickable = Boolean(onColumnHeaderClick && groupDef);
          return (
            <div
              key={col.header}
              className={cn(
                "border-r border-brand-navy/10 last:border-r-0",
                columns.length === 1 ? "min-w-[12rem] flex-1 max-w-md" : "min-w-[9.5rem] flex-1 sm:min-w-[10.5rem]"
              )}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onColumnHeaderClick!(groupDef!.id)}
                  className="flex h-10 w-full items-end justify-center border-b border-brand-navy/10 px-1 pb-1 text-center text-[0.65rem] font-semibold leading-tight text-brand-accent underline decoration-brand-accent/30 underline-offset-2 transition hover:bg-brand-accent/8"
                >
                  {col.header}
                </button>
              ) : (
                <div className="flex h-10 items-end justify-center border-b border-brand-navy/10 px-1 pb-1 text-center text-[0.65rem] font-semibold leading-tight text-brand-navy dark:text-zinc-100">
                  {col.header}
                </div>
              )}
              <ScheduleColumnBody col={col} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type SeamunScheduleVariant = "smt" | "advisor" | "committee";

export type SeamunI2027LockedScheduleVisualProps = {
  initialGroupId?: SeamunScheduleGroupId | null;
  initialCommittee?: string | null;
  defaultView?: "teams" | "detail";
  /** Role-specific UI: SMT full view; advisor timetables only; delegate/chair committee + lunch compare. */
  variant?: SeamunScheduleVariant;
};

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

  const resolvedDefaultView: "teams" | "detail" =
    isSmt ? defaultView : "detail";
  const initialView: "teams" | "detail" =
    resolvedDefaultView === "detail" || initialCommitteeTrimmed || isAdvisor || isCommittee
      ? "detail"
      : resolvedDefaultView;

  const [day, setDay] = useState<1 | 2>(1);
  const [view, setView] = useState<"teams" | "detail">(initialView);
  const [groupId, setGroupId] = useState<SeamunScheduleGroupId | null>(
    seamunI2027DebateScheduleGroupId(initialGroupId) ?? initialGroupFromCommittee
  );
  const [detailMode, setDetailMode] = useState<DetailMode>(
    isAdvisor ? "advisor" : isCommittee || initialCommitteeTrimmed ? "committee" : "advisor"
  );
  const [advisorId, setAdvisorId] = useState<SeamunAdvisorId | null>(null);
  const [committee, setCommittee] = useState<string | null>(initialCommitteeTrimmed);

  const debateHeaders = useMemo(
    () => new Set(SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => g.scheduleHeader)),
    []
  );
  const teamColumns = useMemo(() => {
    const cols = day === 1 ? SEAMUN_I_2027_DAY1_COLUMNS : SEAMUN_I_2027_DAY2_COLUMNS;
    return cols.filter((c) => debateHeaders.has(c.header));
  }, [day, debateHeaders]);
  const handbookHref = seamunI2027HandbookPdfPath();

  const committeesForGroup = useMemo(() => {
    if (!groupId) return [];
    return [...seamunScheduleGroupById(groupId).chambers];
  }, [groupId]);

  const detailColumn = useMemo((): SeamunLockedColumn | null => {
    if (!groupId) return null;
    const def = seamunScheduleGroupById(groupId);

    if (detailMode === "advisor" && advisorId) {
      return {
        header: `${def.scheduleHeader} — Advisor ${advisorId}`,
        blocks: buildSeamunAdvisorDayBlocks(day, groupId, advisorId),
      };
    }

    if (detailMode === "committee" && committee) {
      const blocks = buildSeamunCommitteeDayBlocks(day, committee);
      if (blocks.length === 0) return null;
      return {
        header: `${def.scheduleHeader} — ${committee}`,
        blocks,
      };
    }

    return null;
  }, [day, groupId, detailMode, advisorId, committee]);

  function openDetailView(id: SeamunScheduleGroupId) {
    setGroupId(id);
    if (!isCommittee) {
      setAdvisorId(null);
      setCommittee(null);
    }
    setView("detail");
  }

  function switchDetailMode(mode: DetailMode) {
    setDetailMode(mode);
    setAdvisorId(null);
    setCommittee(null);
  }

  function selectAdvisor(id: SeamunAdvisorId) {
    setDetailMode("advisor");
    setAdvisorId(id);
    setCommittee(null);
  }

  function selectCommittee(ch: string) {
    setDetailMode("committee");
    setCommittee(ch);
    setAdvisorId(null);
    const g = seamunI2027DebateScheduleGroupId(seamunI2027ScheduleGroupForChamber(ch));
    if (g) setGroupId(g);
  }

  const awaitingSelection =
    view === "detail" &&
    groupId &&
    ((detailMode === "advisor" && !advisorId) || (detailMode === "committee" && !committee));

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-navy">{t("title")}</h2>
          <p className="mt-1 text-sm text-brand-muted">{t("body")}</p>
          {isSmt ? <p className="mt-2 text-sm text-brand-navy/90 dark:text-zinc-200">{t("advisorHint")}</p> : null}
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
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={cn(
                "rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-apple",
                day === d
                  ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
                  : "text-brand-muted hover:bg-brand-navy/5"
              )}
            >
              {d === 1 ? tSched("day1Tab") : tSched("day2Tab")}
            </button>
          ))}
        </div>
      </div>

      {isSmt ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setView("teams");
              setAdvisorId(null);
              setCommittee(null);
            }}
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-apple",
              view === "teams"
                ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
                : "text-brand-muted hover:bg-brand-navy/5"
            )}
          >
            {t("viewAllTeams")}
          </button>
          <span className="text-xs text-brand-muted">{t("orPickTeam")}</span>
          {SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => openDetailView(g.id)}
              className={cn(
                "rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-semibold transition-apple",
                view === "detail" && groupId === g.id
                  ? "border-brand-accent/50 bg-brand-accent/12 text-brand-navy"
                  : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35 hover:text-brand-navy"
              )}
            >
              {t(`teamShort.${g.id}`)}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-brand-muted">{t("pickTrack")}</span>
          {SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => openDetailView(g.id)}
              className={cn(
                "rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-semibold transition-apple",
                groupId === g.id
                  ? "border-brand-accent/50 bg-brand-accent/12 text-brand-navy"
                  : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35 hover:text-brand-navy"
              )}
            >
              {t(`teamShort.${g.id}`)}
            </button>
          ))}
        </div>
      )}

      {view === "detail" && groupId ? (
        <div className="mb-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
            {seamunScheduleGroupById(groupId).scheduleHeader}
          </p>

          {isCommittee && committee ? (
            <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{committee}</p>
          ) : null}

          {isSmt ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-brand-muted">{t("viewAs")}</span>
              <div className="inline-flex rounded-[var(--radius-md)] border border-brand-navy/10 bg-white/60 p-0.5 dark:bg-black/25">
                {(["advisor", "committee"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => switchDetailMode(mode)}
                    className={cn(
                      "rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-apple",
                      detailMode === mode
                        ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
                        : "text-brand-muted hover:bg-brand-navy/5"
                    )}
                  >
                    {mode === "advisor" ? t("modeAdvisor") : t("modeCommittee")}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
            {(isSmt || isAdvisor) && (
            <div className={cn("space-y-2", isSmt && detailMode !== "advisor" && "opacity-50")}>
              <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("pickAdvisor")}</p>
              <div className="flex flex-wrap gap-2">
                {SEAMUN_ADVISOR_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={isSmt && detailMode !== "advisor"}
                    onClick={() => selectAdvisor(id)}
                    className={cn(
                      "min-w-[2.75rem] rounded-[var(--radius-md)] border px-3 py-2 text-sm font-bold transition-apple",
                      detailMode === "advisor" && advisorId === id
                        ? "border-brand-accent bg-brand-accent/15 text-brand-navy ring-1 ring-brand-accent/40"
                        : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35 disabled:cursor-not-allowed disabled:hover:border-brand-navy/10"
                    )}
                    aria-pressed={detailMode === "advisor" && advisorId === id}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            )}

            {isSmt ? (
            <>
            <div className="hidden h-auto w-px shrink-0 bg-brand-navy/10 sm:block" aria-hidden />

            <div className={cn("min-w-0 flex-1 space-y-2", detailMode !== "committee" && "opacity-50")}>
              <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("pickCommittee")}</p>
              <div className="flex flex-wrap gap-2">
                {committeesForGroup.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    disabled={detailMode !== "committee"}
                    onClick={() => selectCommittee(ch)}
                    className={cn(
                      "rounded-[var(--radius-md)] border px-2.5 py-1.5 text-left text-xs font-semibold transition-apple",
                      detailMode === "committee" && committee === ch
                        ? "border-brand-accent bg-brand-accent/15 text-brand-navy ring-1 ring-brand-accent/40"
                        : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35 disabled:cursor-not-allowed disabled:hover:border-brand-navy/10"
                    )}
                    aria-pressed={detailMode === "committee" && committee === ch}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            </>
            ) : null}
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

      {awaitingSelection ? (
        <p className="mb-4 rounded-lg border border-dashed border-brand-navy/15 bg-brand-cream/30 px-4 py-6 text-center text-sm text-brand-muted">
          {detailMode === "advisor" ? t("selectAdvisorPrompt") : t("selectCommitteePrompt")}
        </p>
      ) : null}
      {view === "detail" && detailColumn ? (
        <ScheduleGrid columns={[detailColumn]} />
      ) : view === "teams" && isSmt ? (
        <ScheduleGrid columns={teamColumns} onColumnHeaderClick={openDetailView} />
      ) : null}

      {isCommittee && committee ? (
        <SeamunLunchOverlapCompare primaryCommittee={committee} scheduleDay={day} />
      ) : null}

      {isSmt ? (
      <div className="mt-8 border-t border-brand-navy/10 pt-6">
        <h3 className="font-display text-base font-semibold text-brand-navy">{t("committeeMatrixTitle")}</h3>
        <p className="mt-1 text-xs text-brand-muted">{t("committeeMatrixHint")}</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-brand-navy/10">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-navy/[0.04] text-xs uppercase tracking-wide text-brand-muted">
                <th className="px-3 py-2">{t("colScheduleTrack")}</th>
                <th className="px-3 py-2">{t("colChambers")}</th>
              </tr>
            </thead>
            <tbody>
              {SEAMUN_I_2027_DEBATE_SCHEDULE_GROUPS.map((row) => (
                <tr key={row.id} className="border-b border-brand-navy/8 last:border-0">
                  <td className="px-3 py-2 align-top font-semibold text-brand-navy dark:text-zinc-100">
                    <button
                      type="button"
                      onClick={() => openDetailView(row.id)}
                      className="text-left text-brand-accent underline decoration-brand-accent/30 underline-offset-2 hover:decoration-brand-accent"
                    >
                      {row.scheduleHeader}
                    </button>
                  </td>
                  <td className="px-3 py-2 align-top text-brand-navy/90 dark:text-zinc-200">
                    <ul className="space-y-1 text-[0.8rem]">
                      {row.chambers.map((c) => (
                        <li key={c}>
                          <button
                            type="button"
                            onClick={() => {
                              openDetailView(row.id);
                              selectCommittee(c);
                            }}
                            className="text-left text-brand-accent underline decoration-brand-accent/25 underline-offset-2 hover:decoration-brand-accent"
                          >
                            {c}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}
    </div>
  );
}
