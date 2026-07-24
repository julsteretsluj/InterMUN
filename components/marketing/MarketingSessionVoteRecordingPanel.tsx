// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { RollAttendance } from "@/lib/roll-attendance";
import { cn } from "@/lib/utils";
import { MARKETING_SESSION_SURFACE, MARKETING_CHAMBER_PREVIEW, MARKETING_LIGHT_SURFACE, MARKETING_SESSION_INSET, SESSION_FLOOR_LABEL } from "./marketing-preview-styles";

type VoteValue = "yes" | "no" | "abstain" | null;

type DelegateVoteRow = {
  id: string;
  country: string;
  rollAttendance: RollAttendance;
  vote: VoteValue;
};

const MOTION_TITLE = "Closure of debate";
const MOTION_PROCEDURE = "close_debate";
const MUST_VOTE = true;
const REQUIRED_MAJORITY = "2/3" as const;

const DELEGATE_SEED: DelegateVoteRow[] = [
  { id: "kenya", country: "Kenya", rollAttendance: "present_voting", vote: "yes" },
  { id: "mexico", country: "Mexico", rollAttendance: "present_voting", vote: "yes" },
  { id: "norway", country: "Norway", rollAttendance: "present_abstain", vote: null },
  { id: "philippines", country: "Philippines", rollAttendance: "present_voting", vote: "no" },
  { id: "canada", country: "Canada", rollAttendance: "present_voting", vote: "yes" },
  { id: "ghana", country: "Ghana", rollAttendance: "present_voting", vote: null },
  { id: "peru", country: "Peru", rollAttendance: "present_abstain", vote: null },
  { id: "sweden", country: "Sweden", rollAttendance: "absent", vote: null },
];

function rollLabel(
  attendance: RollAttendance,
  t: (key: string) => string
): string {
  switch (attendance) {
    case "absent":
      return t("roll.absent");
    case "present_abstain":
      return t("roll.present_abstain");
    case "present_voting":
      return t("roll.present_voting");
    default:
      return t("roll.unknown");
  }
}

function recordedLabel(value: VoteValue, t: (key: string) => string): string {
  if (value === "yes") return t("recordedYes");
  if (value === "no") return t("recordedNo");
  if (value === "abstain") return t("recordedAbstain");
  return t("recordedNone");
}

export function MarketingSessionVoteRecordingPanel({
  className,
  compactIntro = false,
}: {
  className?: string;
  compactIntro?: boolean;
}) {
  const t = useTranslations("voting");
  const [delegates, setDelegates] = useState<DelegateVoteRow[]>(DELEGATE_SEED);

  const abstainAllowed = !MUST_VOTE;

  const { yes, no, total, passes } = useMemo(() => {
    const counted = delegates.filter((d) => d.vote === "yes" || d.vote === "no");
    const yesCount = counted.filter((d) => d.vote === "yes").length;
    const noCount = counted.filter((d) => d.vote === "no").length;
    const ballotTotal = counted.length;
    const threshold =
      REQUIRED_MAJORITY === "2/3" ? (ballotTotal * 2) / 3 : ballotTotal / 2;
    return {
      yes: yesCount,
      no: noCount,
      total: ballotTotal,
      passes: yesCount > threshold,
    };
  }, [delegates]);

  const recordVote = useCallback((id: string, value: "yes" | "no" | "abstain") => {
    if (value === "abstain" && !abstainAllowed) return;
    setDelegates((prev) =>
      prev.map((row) => (row.id === id ? { ...row, vote: value } : row))
    );
  }, [abstainAllowed]);

  const clearVote = useCallback((id: string) => {
    setDelegates((prev) =>
      prev.map((row) => (row.id === id ? { ...row, vote: null } : row))
    );
  }, []);

  const majorityLabel =
    REQUIRED_MAJORITY === "2/3" ? t("majorityTwoThirds") : t("majoritySimple");

  return (
    <section className={cn("space-y-3", className)}>
      {!compactIntro ? (
        <div className={MARKETING_CHAMBER_PREVIEW}>
          <h3 className="font-display text-lg font-semibold text-white">{t("currentOpenMotion")}</h3>
          <p className="mt-1 text-sm text-white/70">{t("chairRecordVotesHint")}</p>
        </div>
      ) : null}

      <article className={cn(MARKETING_SESSION_SURFACE, "space-y-4")}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3">
          <div className="min-w-0 space-y-1">
            <p className={SESSION_FLOOR_LABEL}>{t("voteTypes.motion")}</p>
            <h3 className="font-display text-lg font-semibold leading-snug text-brand-navy">
              {MOTION_TITLE}
            </h3>
            <p className="text-xs capitalize text-brand-muted">{MOTION_PROCEDURE.replace(/_/g, " ")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-950">
              {t("mustVoteBadge")}
            </span>
            <span className="rounded-full border border-[var(--hairline)] bg-[var(--material-thin)] px-2.5 py-1 text-xs font-medium text-brand-navy">
              {t("majorityLine", { label: majorityLabel })}
            </span>
          </div>
        </header>

        <div className={cn("mun-inset flex flex-wrap items-center gap-x-6 gap-y-2 text-sm", MARKETING_LIGHT_SURFACE, "bg-white/95")}>
          <span>
            <span className="mun-label mr-1">{t("yes")}</span>
            <span className="font-semibold tabular-nums">{yes}</span>
          </span>
          <span>
            <span className="mun-label mr-1">{t("no")}</span>
            <span className="font-semibold tabular-nums">{no}</span>
          </span>
          <span>
            <span className="mun-label mr-1">{t("total")}</span>
            <span className="font-semibold tabular-nums">{total}</span>
          </span>
          {total > 0 ? (
            <span
              className={cn(
                "font-semibold",
                passes ? "text-brand-diplomatic" : "text-rose-700"
              )}
            >
              {passes ? t("preliminaryPassing") : t("preliminaryFailing")}
            </span>
          ) : null}
        </div>

        <div className={cn("mun-inset space-y-2 px-3 py-3", MARKETING_SESSION_INSET)}>
          <div className="space-y-0.5">
            <p className="mun-label text-brand-muted">{t("delegateRollCall", { count: delegates.length })}</p>
            <p className="text-xs leading-relaxed text-brand-muted">{t("chairRecordVotesHint")}</p>
          </div>
          <div className="max-h-[min(18rem,50vh)] overflow-y-auto pr-1">
            <div className={cn("mun-group-list", MARKETING_LIGHT_SURFACE, "overflow-hidden border-zinc-200/90 p-0")}>
              {delegates.map((row) => (
                <div key={row.id} className="transition-apple px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy">{row.country}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {t("rollPrefix")} {rollLabel(row.rollAttendance, t)} · {t("recordedPrefix")}{" "}
                        <span className="font-medium text-zinc-800">
                          {recordedLabel(row.vote, t)}
                        </span>
                      </p>
                    </div>
                    <div
                      className="flex min-w-0 flex-col items-stretch gap-1.5 sm:items-end"
                      role="group"
                      aria-label={`${row.country}: ${t("recordVoteChoice")}`}
                    >
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500 sm:text-right">
                        {t("recordVoteChoice")}
                      </p>
                      <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-zinc-100 p-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => recordVote(row.id, "yes")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:opacity-90",
                            row.vote === "yes" ? "bg-brand-accent ring-2 ring-brand-accent/40" : "bg-brand-accent"
                          )}
                        >
                          {t("yes")}
                        </button>
                        {abstainAllowed ? (
                          <button
                            type="button"
                            onClick={() => recordVote(row.id, "abstain")}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500",
                              row.vote === "abstain"
                                ? "bg-amber-600 ring-2 ring-amber-500/40"
                                : "bg-amber-600"
                            )}
                          >
                            {t("abstain")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title={t("abstainNotApplicableMotionType")}
                            className="cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500"
                          >
                            {t("abstain")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => recordVote(row.id, "no")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600",
                            row.vote === "no"
                              ? "bg-rose-700 ring-2 ring-rose-500/40"
                              : "bg-rose-700"
                          )}
                        >
                          {t("no")}
                        </button>
                        <button
                          type="button"
                          onClick={() => clearVote(row.id)}
                          className="rounded-[var(--radius-pill)] border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm transition-apple hover:bg-zinc-50 active:scale-[0.97]"
                        >
                          {t("clear")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
