"use client";

import { useTranslations } from "next-intl";
import type { VoteItem } from "@/types/database";
import { formatVoteTypeLabel } from "@/lib/i18n/vote-type-label";

export function AdvisorDelegateVotingView({
  voteItems,
  voteByItemId,
  delegateCountry,
}: {
  voteItems: VoteItem[];
  voteByItemId: Record<string, string>;
  delegateCountry: string;
}) {
  const t = useTranslations("advisorDashboard.delegateVoting");
  const tv = useTranslations("voting");

  if (voteItems.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-6 text-center text-sm text-brand-muted">
        {t("empty")}
      </p>
    );
  }

  function ballotLabel(value: string | undefined): string {
    if (!value) return t("noBallot");
    if (value === "yes") return tv("yes");
    if (value === "no") return tv("no");
    if (value === "abstain") return tv("abstain");
    return value;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted">{t("intro", { country: delegateCountry })}</p>
      <ul className="space-y-3">
        {voteItems.map((item) => {
          const ballot = voteByItemId[item.id];
          const closed = Boolean(item.closed_at);
          return (
            <li
              key={item.id}
              className="rounded-xl border border-brand-navy/10 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-zinc-900/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {formatVoteTypeLabel(tv, item.vote_type)}
                  </p>
                  <h2 className="mt-1 font-semibold text-brand-navy dark:text-zinc-100">
                    {item.title?.trim() || tv("untitled")}
                  </h2>
                </div>
                <span className="rounded-full bg-brand-navy/5 px-2.5 py-1 text-xs font-semibold text-brand-muted">
                  {closed ? tv("tabs.closed") : tv("tabs.open")}
                </span>
              </div>
              <p className="mt-3 text-sm text-brand-navy dark:text-zinc-200">
                <span className="font-medium text-brand-muted">{t("delegateBallot")}: </span>
                {ballotLabel(ballot)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
