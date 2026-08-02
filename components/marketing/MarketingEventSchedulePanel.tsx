// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  scheduleSlotRowClass,
  type EventScheduleBlockKind,
  type EventScheduleSlot,
} from "@/lib/event-schedule";
import { cn } from "@/lib/utils";

import { PREVIEW_CARD, PREVIEW_LABEL } from "./marketing-preview-styles";

type MainTab = "day1" | "day2" | "lunch";

type ScheduleGroup = { id: string; name: string };

const GROUPS: ScheduleGroup[] = [
  { id: "ga", name: "GA & specialized" },
  { id: "crisis", name: "Crisis & advanced" },
  { id: "regional", name: "Regional & mixed" },
];

const DAY1_SEED: EventScheduleSlot[] = [
  {
    id: "s1",
    start: "09:00",
    end: "09:45",
    kind: "ceremony",
    label: "Opening ceremony",
    isLunch: false,
  },
  {
    id: "s2",
    start: "10:30",
    end: "12:00",
    kind: "session",
    label: "ECOSOC — Session I",
    isLunch: false,
  },
  {
    id: "s3",
    start: "12:00",
    end: "13:00",
    kind: "break",
    label: "Lunch",
    isLunch: true,
  },
  {
    id: "s4",
    start: "14:00",
    end: "16:00",
    kind: "session",
    label: "Legal — Session I",
    isLunch: false,
  },
];

const DAY2_SEED: EventScheduleSlot[] = [
  {
    id: "d2-1",
    start: "09:30",
    end: "11:30",
    kind: "session",
    label: "WHO — Session II",
    isLunch: false,
  },
  {
    id: "d2-2",
    start: "12:00",
    end: "13:00",
    kind: "break",
    label: "Lunch",
    isLunch: true,
  },
  {
    id: "d2-3",
    start: "16:30",
    end: "17:00",
    kind: "ceremony",
    label: "Closing ceremony",
    isLunch: false,
  },
];

const LUNCH_OVERLAP_FIXTURE = {
  day: 1,
  overlapStart: "12:15",
  overlapEnd: "12:45",
  overlapMinutes: 30,
  labelA: "GA & specialized",
  lunchAStart: "12:00",
  lunchAEnd: "13:00",
  labelB: "Crisis & advanced",
  lunchBStart: "12:15",
  lunchBEnd: "13:15",
};

export function MarketingEventSchedulePanel({ className }: { className?: string }) {
  const t = useTranslations("smtConferenceSettings.schedule");
  const tPreview = useTranslations("marketing.rolePreviews.secretariat");
  const [mainTab, setMainTab] = useState<MainTab>("day1");
  const [activeGroupId, setActiveGroupId] = useState(GROUPS[0]!.id);
  const [slotsByDay, setSlotsByDay] = useState<Record<"day1" | "day2", EventScheduleSlot[]>>({
    day1: DAY1_SEED.map((row) => ({ ...row })),
    day2: DAY2_SEED.map((row) => ({ ...row })),
  });
  const [saved, setSaved] = useState(false);

  const activeGroup = GROUPS.find((g) => g.id === activeGroupId) ?? GROUPS[0]!;
  const rows = mainTab === "day2" ? slotsByDay.day2 : slotsByDay.day1;

  const kindLabel = useMemo(
    () =>
      ({
        session: t("kindSession"),
        break: t("kindBreak"),
        ceremony: t("kindCeremony"),
      }) satisfies Record<EventScheduleBlockKind, string>,
    [t]
  );

  const updateRow = (id: string, patch: Partial<EventScheduleSlot>) => {
    const dayKey = mainTab === "day2" ? "day2" : "day1";
    setSlotsByDay((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey].map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
    setSaved(false);
  };

  return (
    <div className={cn(PREVIEW_CARD, "space-y-3", className)}>
      <div>
        <span className={PREVIEW_LABEL}>{tPreview("scheduleLabel")}</span>
        <h3 className="mt-2 font-sans text-sm font-semibold text-zinc-900">{t("title")}</h3>
        <p className="mt-1 text-[0.65rem] leading-relaxed text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-zinc-200 pb-2">
        {(
          [
            ["day1", t("dayLabel", { day: 1 })] as const,
            ["day2", t("dayLabel", { day: 2 })] as const,
            ["lunch", t("lunchOverlapTab")] as const,
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
              mainTab === key
                ? "bg-[color-mix(in_srgb,var(--accent)_14%,#ffffff)] text-zinc-900 ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)]"
                : "text-zinc-500 hover:bg-zinc-50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mainTab === "lunch" ? (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
          <p className="text-[0.65rem] text-zinc-500">{t("lunchOverlapHelp")}</p>
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800">
            <span className="font-semibold text-zinc-900">
              {t("dayLabel", { day: LUNCH_OVERLAP_FIXTURE.day })} · {LUNCH_OVERLAP_FIXTURE.overlapStart}–
              {LUNCH_OVERLAP_FIXTURE.overlapEnd}
            </span>
            <span className="text-zinc-500">
              {" "}
              ({t("overlapMinutes", { count: LUNCH_OVERLAP_FIXTURE.overlapMinutes })})
            </span>
            <div className="mt-1 text-[0.65rem] leading-snug text-zinc-700">
              <span className="font-medium">{LUNCH_OVERLAP_FIXTURE.labelA}</span> (
              {LUNCH_OVERLAP_FIXTURE.lunchAStart}–{LUNCH_OVERLAP_FIXTURE.lunchAEnd}){" "}
              <span className="text-zinc-500">{t("vs")}</span>{" "}
              <span className="font-medium">{LUNCH_OVERLAP_FIXTURE.labelB}</span> (
              {LUNCH_OVERLAP_FIXTURE.lunchBStart}–{LUNCH_OVERLAP_FIXTURE.lunchBEnd})
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("groupsLabel")}
            </span>
            <div className="flex flex-wrap gap-1">
              {GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={cn(
                    "max-w-[9rem] truncate rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold",
                    activeGroupId === group.id
                      ? "border-[color-mix(in_srgb,var(--accent)_40%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_12%,#ffffff)] text-zinc-900"
                      : "border-zinc-200 text-zinc-500"
                  )}
                  title={group.name}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[0.65rem] text-zinc-600">
            <span className="font-semibold uppercase tracking-wide text-zinc-500">{t("renameGroup")}:</span>{" "}
            {activeGroup.name}
          </p>

          <div className="flex flex-wrap gap-2 text-[0.6rem] text-zinc-700">
            <span className="font-semibold uppercase tracking-wide text-zinc-500">{t("legendTitle")}</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" aria-hidden />
              {t("legendSession")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" aria-hidden />
              {t("legendBreak")}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[#C2A878]" aria-hidden />
              {t("legendCeremony")}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[32rem] text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[0.65rem] uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2">{t("colStart")}</th>
                  <th className="px-2 py-2">{t("colEnd")}</th>
                  <th className="px-2 py-2">{t("colKind")}</th>
                  <th className="px-2 py-2">{t("colLabel")}</th>
                  <th className="px-2 py-2 text-center">{t("colLunch")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={cn("border-b border-zinc-100", scheduleSlotRowClass(row.kind))}>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="time"
                        value={row.start}
                        onChange={(e) => updateRow(row.id, { start: e.target.value })}
                        className="w-[6.5rem] rounded border border-zinc-200 px-1.5 py-1 text-[0.65rem] text-zinc-900"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        type="time"
                        value={row.end}
                        onChange={(e) => updateRow(row.id, { end: e.target.value })}
                        className="w-[6.5rem] rounded border border-zinc-200 px-1.5 py-1 text-[0.65rem] text-zinc-900"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <select
                        value={row.kind}
                        onChange={(e) => updateRow(row.id, { kind: e.target.value as EventScheduleBlockKind })}
                        className="max-w-[7rem] rounded border border-zinc-200 px-1.5 py-1 text-[0.65rem] text-zinc-900"
                        aria-label={t("colKind")}
                      >
                        <option value="session">{kindLabel.session}</option>
                        <option value="break">{kindLabel.break}</option>
                        <option value="ceremony">{kindLabel.ceremony}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <input
                        value={row.label}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                        placeholder={t("blockPlaceholder")}
                        className="w-full min-w-[8rem] rounded border border-zinc-200 px-1.5 py-1 text-[0.65rem] text-zinc-900"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={row.isLunch}
                        onChange={(e) => updateRow(row.id, { isLunch: e.target.checked })}
                        aria-label={t("lunchCheckboxAria")}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              setSlotsByDay((prev) => {
                const dayKey = mainTab === "day2" ? "day2" : "day1";
                return {
                  ...prev,
                  [dayKey]: [
                    ...prev[dayKey],
                    {
                      id: `new-${Date.now()}`,
                      start: "09:00",
                      end: "10:30",
                      kind: "session",
                      label: "",
                      isLunch: false,
                    },
                  ],
                };
              })
            }
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {t("addBlock")}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => setSaved(true)}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
      >
        {saved ? t("saved") : t("saveSchedule")}
      </button>
    </div>
  );
}
