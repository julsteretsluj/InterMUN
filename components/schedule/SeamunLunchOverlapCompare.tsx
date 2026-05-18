"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  computeSeamunCommitteeLunchOverlaps,
  SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES,
} from "@/lib/seamun-i-2027-lunch-overlap";
import { seamunAllScheduleCommittees } from "@/lib/seamun-i-2027-advisor-schedules";

export function SeamunLunchOverlapCompare({
  primaryCommittee,
  scheduleDay,
}: {
  primaryCommittee: string;
  scheduleDay: 1 | 2;
}) {
  const t = useTranslations("smtConferenceSettings.schedule.lunchOverlap");
  const tSched = useTranslations("smtConferenceSettings.schedule");
  const [overlapDay, setOverlapDay] = useState<1 | 2>(scheduleDay);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setOverlapDay(scheduleDay);
  }, [scheduleDay]);

  const allCommittees = useMemo(() => seamunAllScheduleCommittees(), []);
  const primaryKey = primaryCommittee.trim();

  const pickable = useMemo(
    () => allCommittees.filter((c) => c.trim().toLowerCase() !== primaryKey.toLowerCase()),
    [allCommittees, primaryKey]
  );

  const overlaps = useMemo(
    () => computeSeamunCommitteeLunchOverlaps(overlapDay, primaryKey, selected),
    [overlapDay, primaryKey, selected]
  );

  function toggleCommittee(ch: string) {
    setSelected((prev) => {
      const norm = ch.trim().toLowerCase();
      if (prev.some((p) => p.trim().toLowerCase() === norm)) {
        return prev.filter((p) => p.trim().toLowerCase() !== norm);
      }
      if (prev.length >= SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES) return prev;
      return [...prev, ch];
    });
  }

  return (
    <div className="mt-8 border-t border-brand-navy/10 pt-6">
      <h3 className="font-display text-base font-semibold text-brand-navy dark:text-zinc-100">{t("title")}</h3>
      <p className="mt-1 text-xs text-brand-muted">{t("body", { max: SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES })}</p>
      <p className="mt-2 text-sm font-semibold text-brand-navy dark:text-zinc-100">{primaryKey}</p>

      <div className="mt-4 flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-brand-navy/10 bg-white/60 p-0.5 dark:bg-black/25">
        {([1, 2] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setOverlapDay(d)}
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-apple",
              overlapDay === d
                ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
                : "text-brand-muted hover:bg-brand-navy/5"
            )}
          >
            {d === 1 ? tSched("day1Tab") : tSched("day2Tab")}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("pickCommittees")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pickable.map((ch) => {
          const on = selected.some((s) => s.trim().toLowerCase() === ch.trim().toLowerCase());
          const atCap = selected.length >= SEAMUN_MAX_LUNCH_COMPARE_COMMITTEES && !on;
          return (
            <button
              key={ch}
              type="button"
              disabled={atCap}
              onClick={() => toggleCommittee(ch)}
              className={cn(
                "rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-semibold transition-apple",
                on
                  ? "border-brand-accent bg-brand-accent/15 text-brand-navy ring-1 ring-brand-accent/40"
                  : "border-brand-navy/10 text-brand-muted hover:border-brand-accent/35 disabled:cursor-not-allowed disabled:opacity-50"
              )}
              aria-pressed={on}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-brand-navy/15 bg-brand-cream/30 px-4 py-4 text-center text-sm text-brand-muted">
          {t("noneSelected")}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {overlaps.map((row) => (
            <li
              key={`${row.day}-${row.compareCommittee}`}
              className="rounded-xl border border-brand-navy/10 bg-brand-cream/20 px-4 py-3 text-sm dark:bg-black/20"
            >
              <p className="font-semibold text-brand-navy dark:text-zinc-100">{row.compareCommittee}</p>
              <p className="mt-1 text-xs text-brand-muted">
                {t("yourLunch")}: {row.primaryStart}–{row.primaryEnd} · {t("theirLunch")}: {row.compareStart}–
                {row.compareEnd}
              </p>
              {row.overlapMinutes > 0 && row.overlapStart && row.overlapEnd ? (
                <p className="mt-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {t("overlap", {
                    start: row.overlapStart,
                    end: row.overlapEnd,
                    minutes: row.overlapMinutes,
                  })}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-brand-muted">{t("noOverlap")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
