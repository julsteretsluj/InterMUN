"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { totalEarnedCheckpoints, type MilestoneProgress } from "@/lib/committee-milestones";
import type {
  CommitteeMilestoneGroup,
  DelegateMilestoneRow,
  MilestonesData,
} from "@/lib/milestones-data";

function MilestoneTile({ progress }: { progress: MilestoneProgress }) {
  const t = useTranslations("milestones");
  const maxed = progress.nextThreshold == null;
  const pct = Math.round(progress.fractionToNext * 100);

  return (
    <div className="mun-card-dense flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {progress.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-navy">
          {t(`metric.${progress.metricId}`)}
        </span>
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-brand-navy">
          {progress.count}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {progress.tiers.map((tier) => (
          <span
            key={tier.threshold}
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums",
              tier.achieved
                ? "bg-[color:color-mix(in_srgb,var(--gold)_22%,transparent)] text-[var(--gold-bright,#caa64a)] ring-1 ring-[color:color-mix(in_srgb,var(--gold)_45%,transparent)]"
                : "bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)] text-brand-muted"
            )}
            title={tier.achieved ? t("achieved") : t("locked")}
          >
            <span
              className={cn("mr-1 leading-none", !tier.achieved && "opacity-50 grayscale")}
              aria-hidden
            >
              {tier.icon}
            </span>
            {tier.plus ? t("tierPlus", { n: tier.threshold }) : tier.threshold}
          </span>
        ))}
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={maxed ? 100 : pct}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            maxed ? "bg-[var(--gold,#caa64a)]" : "bg-[var(--accent)]"
          )}
          style={{ width: `${maxed ? 100 : pct}%` }}
        />
      </div>

      <p className="text-[0.7rem] text-brand-muted">
        {maxed
          ? t("allEarned")
          : t("progressToNext", { count: progress.count, next: progress.nextThreshold ?? 0 })}
      </p>
    </div>
  );
}

function MilestoneGrid({ items }: { items: MilestoneProgress[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((p) => (
        <MilestoneTile key={p.metricId} progress={p} />
      ))}
    </div>
  );
}

function EarnedBadge({ items }: { items: MilestoneProgress[] }) {
  const t = useTranslations("milestones");
  const { earned, total } = totalEarnedCheckpoints(items);
  return (
    <span className="dashboard-status-badge dashboard-status-badge--gold shrink-0">
      {t("earnedOfTotal", { earned, total })}
    </span>
  );
}

function DelegateLeaderboard({ delegates }: { delegates: DelegateMilestoneRow[] }) {
  const t = useTranslations("milestones");
  if (delegates.length === 0) {
    return <p className="text-sm text-brand-muted">{t("emptyDelegates")}</p>;
  }
  return (
    <ul className="divide-y divide-[var(--hairline)]">
      {delegates.map((d) => (
        <li key={d.allocationId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 sm:w-48 sm:shrink-0">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-navy">{d.label}</span>
            <EarnedBadge items={d.milestones} />
          </div>
          <div className="flex flex-1 flex-wrap gap-3">
            {d.milestones.map((p) => {
              const highest = p.highestAchieved;
              return (
                <div key={p.metricId} className="flex items-center gap-1.5 text-xs text-brand-muted">
                  <span aria-hidden>{p.icon}</span>
                  <span className="font-mono font-semibold tabular-nums text-brand-navy">{p.count}</span>
                  <span className="hidden sm:inline">{t(`metric.${p.metricId}`)}</span>
                  {highest != null ? (
                    <span className="rounded-full bg-[color:color-mix(in_srgb,var(--gold)_20%,transparent)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--gold-bright,#caa64a)]">
                      {p.nextThreshold == null ? t("tierPlus", { n: highest }) : highest}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommitteeSection({ group }: { group: CommitteeMilestoneGroup }) {
  const t = useTranslations("milestones");
  const hasCommittee = group.committee.length > 0;
  return (
    <section className="dashboard-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="dashboard-panel-title">{t("committeeTitle", { committee: group.label })}</h3>
        {hasCommittee ? <EarnedBadge items={group.committee} /> : null}
      </div>
      {hasCommittee ? <MilestoneGrid items={group.committee} /> : null}
      {group.delegates.length > 0 ? (
        <div
          className={cn(
            "space-y-2",
            hasCommittee && "border-t border-[var(--hairline)] pt-4"
          )}
        >
          <h4 className="text-sm font-semibold text-brand-navy">{t("delegateLeaderboard")}</h4>
          <DelegateLeaderboard delegates={group.delegates} />
        </div>
      ) : null}
    </section>
  );
}

export function MilestonesView({ data }: { data: MilestonesData }) {
  const t = useTranslations("milestones");
  const hasAnything = data.self != null || data.committees.length > 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <p className="text-sm text-brand-muted">{t("intro")}</p>

      {data.self ? (
        <section className="dashboard-panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="dashboard-panel-title">{t("yourMilestones")}</h3>
            <EarnedBadge items={data.self.milestones} />
          </div>
          <MilestoneGrid items={data.self.milestones} />
        </section>
      ) : null}

      {data.committees.map((group) => (
        <CommitteeSection key={group.conferenceId} group={group} />
      ))}

      {!hasAnything ? <p className="text-sm text-brand-muted">{t("empty")}</p> : null}
    </div>
  );
}
