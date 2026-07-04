"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Pause, Play, SkipForward } from "lucide-react";
import { HelpButton } from "@/components/HelpButton";
import type { RollAttendance } from "@/lib/roll-attendance";
import {
  ROLL_ATTENDANCE_BUTTONS,
} from "@/lib/roll-call-attendance-buttons";
import { cn } from "@/lib/utils";

import {
  MARKETING_DARK_GLASS_CARD,
  PREVIEW_CARD,
  PREVIEW_HEADING,
  PREVIEW_LABEL,
  PREVIEW_MUTED,
  PREVIEW_ROW,
} from "@/components/marketing/marketing-preview-styles";
type RollRow = { id: string; country: string; status: RollAttendance };

const HERO_ROLL_ALL: RollRow[] = [
  { id: "kenya", country: "Kenya", status: "present_voting" },
  { id: "mexico", country: "Mexico", status: "present_voting" },
  { id: "norway", country: "Norway", status: "present_abstain" },
  { id: "philippines", country: "Philippines", status: "absent" },
  { id: "canada", country: "Canada", status: "present_voting" },
  { id: "ghana", country: "Ghana", status: "present_voting" },
  { id: "peru", country: "Peru", status: "present_abstain" },
  { id: "sweden", country: "Sweden", status: "absent" },
];

const HERO_ROLL_SEED = HERO_ROLL_ALL.slice(0, 4);

const HERO_SPEAKER_SEED = ["Norway", "Spain", "Italy", "Portugal", "Kenya", "Mexico", "Ghana", "Peru"];

function formatTimer(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MarketingRollCallCard({
  rows,
  onSetAttendance,
  onDarkSurface = false,
}: {
  rows: RollRow[];
  onSetAttendance: (id: string, status: RollAttendance) => void;
  onDarkSurface?: boolean;
}) {
  const t = useTranslations("sessionControlClient");
  const heading = onDarkSurface ? "text-white" : "text-brand-navy";
  const muted = onDarkSurface ? "text-white/70" : "text-brand-muted";
  const body = onDarkSurface ? "text-white" : "text-brand-navy";
  const initBtn = onDarkSurface
    ? "rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
    : "rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-4 py-2 text-sm font-medium text-brand-navy hover:bg-[var(--material-thick)]";

  return (
    <section className={cn("space-y-4", body)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={cn("font-display text-lg font-semibold", heading)}>
          ✅ {t("rollCallTracker")}
        </h3>
        <HelpButton
          title={t("rollCallTracker")}
          className={
            onDarkSurface
              ? "border-white/20 bg-white/10 text-white/85 hover:bg-white/20 dark:border-white/20 dark:bg-white/10 dark:text-white/85"
              : undefined
          }
        >
          {t("rollCallHelp")}
        </HelpButton>
      </div>
      <p className={cn("text-sm", muted)}>{t("rollCallIntro")}</p>
      <div className={cn(MARKETING_DARK_GLASS_CARD, "space-y-4", onDarkSurface && "text-white")}>
        <button type="button" className={initBtn}>
          {t("initializeRowsAllAllocations")}
        </button>
        <div>
          <h4 className={cn("font-display text-base font-semibold", onDarkSurface ? "text-white" : heading)}>
            👥 {t("delegates")}
          </h4>
          <p className={cn("mt-1 text-sm", muted)}>{t("delegateRollStatusHint")}</p>
        </div>
        <ul className={cn("space-y-3 text-sm", body)}>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-lg border border-white/12 bg-black/15 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="shrink-0 font-medium">{row.country}</span>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t("rollCallForCountry", { country: row.country })}
              >
                {ROLL_ATTENDANCE_BUTTONS.map((opt) => {
                  const active = row.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={t(opt.titleKey)}
                      onClick={() => onSetAttendance(row.id, opt.value)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                        active ? opt.activeClass : opt.inactiveClass
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MarketingSpeakersCard({
  queue,
  secondsLeft,
  running,
  expanded,
  onToggleTimer,
  onNext,
  onToggleExpand,
}: {
  queue: string[];
  secondsLeft: number;
  running: boolean;
  expanded: boolean;
  onToggleTimer: () => void;
  onNext: () => void;
  onToggleExpand: () => void;
}) {
  const t = useTranslations("marketing.preview");
  const current = queue[0] ?? "—";
  const waiting = queue.slice(1);
  const visible = expanded ? waiting : waiting.slice(0, 3);
  const hiddenCount = Math.max(0, waiting.length - visible.length);

  return (
    <div className={PREVIEW_CARD}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={PREVIEW_LABEL}>{t("speakersLabel")}</span>
        <span className="text-[0.65rem] text-brand-muted">{t("speakersHint")}</span>
      </div>
      <div className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_10%,#ffffff)] px-3 py-2.5">
        <p className={cn("text-xs", PREVIEW_MUTED)}>{t("nowSpeaking")}</p>
        <div className="mt-0.5 flex items-end justify-between gap-3">
          <p className={cn("font-display text-base", PREVIEW_HEADING)}>{current}</p>
          <p className="font-mono text-sm font-semibold tabular-nums text-[var(--accent)]" suppressHydrationWarning>
            {formatTimer(secondsLeft)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleTimer}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {running ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {running ? t("speakersPause") : t("speakersStart")}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={queue.length < 2}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_30%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_12%,#ffffff)] px-2.5 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-[color-mix(in_srgb,var(--accent)_18%,#ffffff)] disabled:opacity-45"
          >
            <SkipForward className="h-3.5 w-3.5" aria-hidden />
            {t("speakersNext")}
          </button>
        </div>
      </div>
      <ul className={cn("space-y-1.5 text-sm", PREVIEW_MUTED)}>
        {visible.map((country) => (
          <li key={country} className="rounded-lg px-1 py-0.5 text-zinc-600">
            {country}
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li>
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  {t("queueCollapse")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  {t("queueExpand", { count: hiddenCount })}
                </>
              )}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Hero + chair sections: roll call and speakers list with local demo state. */
export function MarketingHeroSessionPreview({ className }: { className?: string }) {
  const [roll, setRoll] = useState<RollRow[]>(HERO_ROLL_SEED);
  const [queue, setQueue] = useState(HERO_SPEAKER_SEED);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const setRollAttendance = useCallback((id: string, status: RollAttendance) => {
    setRoll((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }, []);

  const toggleTimer = useCallback(() => setRunning((v) => !v), []);

  const advanceSpeaker = useCallback(() => {
    setQueue((prev) => {
      if (prev.length < 2) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    setSecondsLeft(90);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft]);

  return (
    <div className={cn("space-y-4", className)}>
      <MarketingRollCallCard rows={roll} onSetAttendance={setRollAttendance} onDarkSurface />
      <MarketingSpeakersCard
        queue={queue}
        secondsLeft={secondsLeft}
        running={running}
        expanded={expanded}
        onToggleTimer={toggleTimer}
        onNext={advanceSpeaker}
        onToggleExpand={() => setExpanded((v) => !v)}
      />
    </div>
  );
}

type VoteChoice = "in_favor" | "against" | null;

export function MarketingChairMotionPreview({ className }: { className?: string }) {
  const t = useTranslations("marketing.preview");
  const [roll, setRoll] = useState<RollRow[]>(HERO_ROLL_ALL.slice(0, 4));
  const [choice, setChoice] = useState<VoteChoice>(null);
  const [yesCount, setYesCount] = useState(11);
  const [noCount, setNoCount] = useState(4);

  const setRollAttendance = useCallback((id: string, status: RollAttendance) => {
    setRoll((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }, []);

  const recordVote = useCallback(
    (next: VoteChoice) => {
      setChoice((prev) => {
        if (prev === "in_favor") setYesCount((n) => Math.max(0, n - 1));
        if (prev === "against") setNoCount((n) => Math.max(0, n - 1));
        if (next === "in_favor") setYesCount((n) => n + 1);
        if (next === "against") setNoCount((n) => n + 1);
        return prev === next ? null : next;
      });
    },
    []
  );

  const totalNeeded = 17;
  const threshold = Math.ceil((totalNeeded * 2) / 3);

  return (
    <div className={cn("space-y-4", className)}>
      <MarketingRollCallCard rows={roll} onSetAttendance={setRollAttendance} onDarkSurface />
      <div className={PREVIEW_CARD}>
        <p className={PREVIEW_LABEL}>{t("voteLabel")}</p>
        <p className="mt-2 font-display text-base font-semibold text-zinc-900">{t("voteTitle")}</p>
        <p className={cn("mt-1", PREVIEW_MUTED)}>
          {t("voteMetaInteractive", { yes: yesCount, no: noCount, needed: threshold, total: totalNeeded })}
        </p>
        <p className="mt-2 text-[0.7rem] text-zinc-500">{t("voteHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => recordVote("in_favor")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              choice === "in_favor"
                ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--accent)] ring-2 ring-[var(--accent)]/40"
                : "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
            )}
          >
            {t("voteAccept")}
          </button>
          <button
            type="button"
            onClick={() => recordVote("against")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              choice === "against"
                ? "border-rose-400/60 bg-rose-500/10 text-rose-800 ring-2 ring-rose-400/35"
                : "border-zinc-200 text-zinc-600 hover:border-rose-300 hover:text-rose-800"
            )}
          >
            {t("voteReject")}
          </button>
        </div>
      </div>
    </div>
  );
}

const PREP_TILE_KEYS = ["documents", "resolutions", "speeches", "stances"] as const;

export function MarketingDelegatePrepPreview({ className }: { className?: string }) {
  const t = useTranslations("marketing.preview");
  const [active, setActive] = useState<string>("documents");

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {PREP_TILE_KEYS.map((key) => {
        const selected = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={cn(
              "rounded-2xl border p-4 text-left shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] transition [color-scheme:light]",
              selected
                ? "border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_10%,#ffffff)]"
                : "border-zinc-200 bg-white hover:border-[color-mix(in_srgb,var(--accent)_25%,#d4d4d8)]"
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t(`prepTile.${key}`)}
            </p>
            <p className="mt-2 font-display text-sm font-semibold text-zinc-900">
              {selected ? t("prepActive") : t("prepReady")}
            </p>
          </button>
        );
      })}
    </div>
  );
}

const SMT_CHAMBERS = ["ECOSOC", "Legal", "WHO", "Press Corps"] as const;

export function MarketingSmtOversightPreview({ className }: { className?: string }) {
  const t = useTranslations("marketing.preview");
  const [liveId, setLiveId] = useState<string>("ECOSOC");

  return (
    <div className={cn(PREVIEW_CARD, className)}>
      <p className={PREVIEW_LABEL}>{t("smtLabel")}</p>
      <p className="mt-1 mb-3 text-[0.7rem] text-zinc-500">{t("smtHint")}</p>
      <ul className="space-y-2">
        {SMT_CHAMBERS.map((committee) => {
          const live = liveId === committee;
          return (
            <li key={committee}>
              <button
                type="button"
                onClick={() => setLiveId(committee)}
                className={cn(
                  PREVIEW_ROW,
                  live && "border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_8%,#ffffff)]"
                )}
              >
                <span className="font-medium text-zinc-900">{committee}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      live ? "bg-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]" : "bg-brand-muted/40"
                    )}
                    aria-hidden
                  />
                  {live ? t("smtLive") : t("smtIdle")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
