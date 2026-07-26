// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { RollAttendance } from "@/lib/roll-attendance";
import { cn } from "@/lib/utils";
import { MARKETING_SESSION_SURFACE, MARKETING_CHAMBER_PREVIEW } from "./marketing-preview-styles";

type VoteValue = "yes" | "no" | "abstain" | null;

type DelegateVoteRow = {
  id: string;
  country: string;
  rollAttendance: RollAttendance;
  vote: VoteValue;
};

const MOTION_TITLE = "Closure of debate";
const MUST_VOTE = true;
const REQUIRED_MAJORITY = "2/3" as const;

const DELEGATE_SEED: DelegateVoteRow[] = [
  { id: "kenya", country: "Kenya", rollAttendance: "present_voting", vote: "yes" },
  { id: "mexico", country: "Mexico", rollAttendance: "present_voting", vote: "yes" },
  { id: "norway", country: "Norway", rollAttendance: "present_abstain", vote: null },
  { id: "philippines", country: "Philippines", rollAttendance: "present_voting", vote: "no" },
];

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
          <h3 className="font-display text-lg font-semibold text-brand-navy">{t("currentOpenMotion")}</h3>
          <p className="mt-1 text-sm text-brand-muted">{t("chairRecordVotesHint")}</p>
        </div>
      ) : null}

      <article className={cn(MARKETING_SESSION_SURFACE, "space-y-5 p-5")}>
        <header className="space-y-1">
          <p className="text-[0.75rem] font-medium text-brand-muted">{t("voteTypes.motion")}</p>
          <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-brand-navy">{MOTION_TITLE}</h3>
          <p className="text-[0.8125rem] text-brand-muted">
            {t("majorityLine", { label: majorityLabel })}
          </p>
        </header>

        <div className="flex gap-6 text-[0.9375rem] text-brand-navy">
          <span>
            <span className="text-brand-muted">{t("yes")} </span>
            <span className="font-semibold tabular-nums">{yes}</span>
          </span>
          <span>
            <span className="text-brand-muted">{t("no")} </span>
            <span className="font-semibold tabular-nums">{no}</span>
          </span>
          <span className={cn("font-medium", passes ? "text-[var(--accent)]" : "text-brand-muted")}>
            {total > 0 ? (passes ? t("preliminaryPassing") : t("preliminaryFailing")) : null}
          </span>
        </div>

        <div className="space-y-1 border-t border-[var(--hairline)] pt-2">
          {delegates.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 py-2.5 text-[0.9375rem]"
            >
              <div className="min-w-0">
                <p className="font-medium text-brand-navy">{row.country}</p>
                <p className="text-[0.75rem] text-brand-muted">{recordedLabel(row.vote, t)}</p>
              </div>
              <div className="flex shrink-0 gap-1.5" role="group" aria-label={`${row.country}: ${t("recordVoteChoice")}`}>
                <button
                  type="button"
                  onClick={() => recordVote(row.id, "yes")}
                  className={cn(
                    "rounded-[var(--radius-md)] px-2.5 py-1 text-[0.75rem] font-medium transition-apple",
                    row.vote === "yes"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--apple-bg-secondary)] text-brand-navy"
                  )}
                >
                  {t("yes")}
                </button>
                <button
                  type="button"
                  onClick={() => recordVote(row.id, "no")}
                  className={cn(
                    "rounded-[var(--radius-md)] px-2.5 py-1 text-[0.75rem] font-medium transition-apple",
                    row.vote === "no"
                      ? "bg-[var(--system-red)] text-white"
                      : "bg-[var(--apple-bg-secondary)] text-brand-navy"
                  )}
                >
                  {t("no")}
                </button>
                <button
                  type="button"
                  onClick={() => clearVote(row.id)}
                  className="rounded-[var(--radius-md)] px-2 py-1 text-[0.75rem] text-brand-muted transition-apple hover:text-brand-navy"
                >
                  {t("clear")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
