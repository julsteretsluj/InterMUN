"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  SEAMUN_I_2027_AXIS_END_MIN,
  SEAMUN_I_2027_AXIS_START_MIN,
  SEAMUN_I_2027_DAY1_COLUMNS,
  SEAMUN_I_2027_DAY2_COLUMNS,
  type SeamunLockedBlock,
  type SeamunLockedBlockCategory,
  timeToMinutes,
} from "@/lib/seamun-i-2027-locked-schedule";

const AXIS_RANGE = SEAMUN_I_2027_AXIS_END_MIN - SEAMUN_I_2027_AXIS_START_MIN;

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

export function SeamunI2027LockedScheduleVisual() {
  const t = useTranslations("smtConferenceSettings.schedule.seamunLocked");
  const tSched = useTranslations("smtConferenceSettings.schedule");
  const [day, setDay] = useState<1 | 2>(1);
  const columns = day === 1 ? SEAMUN_I_2027_DAY1_COLUMNS : SEAMUN_I_2027_DAY2_COLUMNS;

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-navy">{t("title")}</h2>
          <p className="mt-1 text-sm text-brand-muted">{t("body")}</p>
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

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("legendTitle")}</p>
      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-[0.65rem] text-brand-navy/90 dark:text-zinc-200">
        {LEGEND_DEF.map(({ cat, msg }) => (
          <span key={cat} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-4 shrink-0 rounded-sm border", categoryClass(cat))} aria-hidden />
            {t(msg)}
          </span>
        ))}
      </div>

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
              className="min-w-[9.5rem] flex-1 border-r border-brand-navy/10 last:border-r-0 sm:min-w-[10.5rem]"
            >
              <div className="flex h-10 items-end justify-center border-b border-brand-navy/10 px-1 pb-1 text-center text-[0.65rem] font-semibold leading-tight text-brand-navy dark:text-zinc-100">
                {col.header}
              </div>
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
                      {b.location ? (
                        <p className="mt-0.5 text-[0.52rem] font-medium leading-tight opacity-90 sm:text-[0.55rem]">
                          {b.location}
                        </p>
                      ) : null}
                      <p className="mt-0.5 font-mono text-[0.52rem] tabular-nums opacity-80 sm:text-[0.55rem]">
                        {b.start}–{b.end}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
