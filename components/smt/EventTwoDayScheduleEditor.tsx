// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveEventScheduleConfigAction } from "@/app/actions/smtConference";
import {
  addDayToConfig,
  addGroupToConfig,
  computeLunchOverlaps,
  defaultEventScheduleConfig,
  EVENT_SCHEDULE_BLOCK_KINDS,
  MAX_SCHEDULE_DAYS,
  MIN_SCHEDULE_DAYS,
  newSlot,
  normalizeScheduleConfig,
  removeDayFromConfig,
  removeGroupFromConfig,
  scheduleSlotRowClass,
  sortedScheduleDayKeys,
  type EventScheduleBlockKind,
  type EventScheduleConfig,
  type EventScheduleDayKey,
  type EventScheduleSlot,
} from "@/lib/event-schedule";
import { cn } from "@/lib/utils";

type MainTab = "lunch" | `day:${EventScheduleDayKey}`;

function dayKeyFromTab(tab: MainTab): EventScheduleDayKey | null {
  if (tab === "lunch") return null;
  return tab.slice(4);
}

export function EventTwoDayScheduleEditor({
  eventId,
  initialConfig,
}: {
  eventId: string;
  initialConfig: unknown;
}) {
  const t = useTranslations("smtConferenceSettings.schedule");
  const [cfg, setCfg] = useState<EventScheduleConfig>(() => normalizeScheduleConfig(initialConfig));
  const dayKeys = useMemo(() => sortedScheduleDayKeys(cfg.slots), [cfg.slots]);
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    const days = sortedScheduleDayKeys(normalizeScheduleConfig(initialConfig).slots);
    return days[0] ? `day:${days[0]}` : "lunch";
  });
  const [activeGroupId, setActiveGroupId] = useState<string>(() => normalizeScheduleConfig(initialConfig).groups[0]?.id ?? "");
  const [newGroupName, setNewGroupName] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep tab/group selections valid for the current config (adjust state during render).
  if (cfg.groups.length > 0 && !cfg.groups.some((g) => g.id === activeGroupId)) {
    setActiveGroupId(cfg.groups[0]!.id);
  }
  const activeDayForTab = mainTab === "lunch" ? null : dayKeyFromTab(mainTab);
  if (mainTab !== "lunch" && (!activeDayForTab || !dayKeys.includes(activeDayForTab))) {
    setMainTab(dayKeys[0] ? `day:${dayKeys[0]}` : "lunch");
  }

  const dayKey = dayKeyFromTab(mainTab);
  const overlaps = useMemo(() => computeLunchOverlaps(cfg), [cfg]);

  const activeGroup = cfg.groups.find((g) => g.id === activeGroupId) ?? cfg.groups[0];
  const rows: EventScheduleSlot[] =
    dayKey && activeGroup ? (cfg.slots[dayKey]?.[activeGroup.id] ?? []) : [];

  function updateSlot(day: EventScheduleDayKey, groupId: string, slotId: string, patch: Partial<EventScheduleSlot>) {
    setCfg((prev) => {
      const list = [...(prev.slots[day][groupId] ?? [])];
      const idx = list.findIndex((s) => s.id === slotId);
      if (idx < 0) return prev;
      list[idx] = { ...list[idx]!, ...patch };
      return {
        ...prev,
        slots: { ...prev.slots, [day]: { ...prev.slots[day], [groupId]: list } },
      };
    });
  }

  function addBlock() {
    if (!dayKey || !activeGroup) return;
    setCfg((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [dayKey]: {
          ...prev.slots[dayKey],
          [activeGroup.id]: [...(prev.slots[dayKey][activeGroup.id] ?? []), newSlot()],
        },
      },
    }));
  }

  function removeBlock(slotId: string) {
    if (!dayKey || !activeGroup) return;
    setCfg((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [dayKey]: {
          ...prev.slots[dayKey],
          [activeGroup.id]: (prev.slots[dayKey][activeGroup.id] ?? []).filter((s) => s.id !== slotId),
        },
      },
    }));
  }

  function renameGroup(groupId: string, name: string) {
    setCfg((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, name } : g)),
    }));
  }

  function onSave() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveEventScheduleConfigAction(eventId, cfg);
      if (res.error) setMessage({ error: res.error });
      else setMessage({ ok: true });
    });
  }

  function onResetDefaults() {
    if (!window.confirm(t("confirmReset"))) return;
    const next = defaultEventScheduleConfig();
    setCfg(next);
    setActiveGroupId(next.groups[0]?.id ?? "");
    const firstDay = sortedScheduleDayKeys(next.slots)[0];
    setMainTab(firstDay ? `day:${firstDay}` : "lunch");
    setMessage(null);
  }

  function onAddDay() {
    setCfg((prev) => {
      const next = addDayToConfig(prev);
      const added = sortedScheduleDayKeys(next.slots).at(-1);
      if (added) setMainTab(`day:${added}`);
      return next;
    });
  }

  function onRemoveDay() {
    if (!dayKey || dayKeys.length <= MIN_SCHEDULE_DAYS) return;
    if (!window.confirm(t("confirmRemoveDay", { day: dayKey }))) return;
    const removing = dayKey;
    setCfg((prev) => removeDayFromConfig(prev, removing));
    const remaining = dayKeys.filter((d) => d !== removing);
    setMainTab(remaining[0] ? `day:${remaining[0]}` : "lunch");
  }

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
      <h2 className="font-sans text-xl font-semibold text-brand-navy mb-1">{t("title")}</h2>
      <p className="text-sm text-brand-muted mb-5">{t("subtitle")}</p>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-brand-navy/10 pb-3">
        {dayKeys.map((dk) => (
          <button
            key={dk}
            type="button"
            onClick={() => setMainTab(`day:${dk}`)}
            className={cn(
              "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold transition-apple",
              mainTab === `day:${dk}`
                ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
                : "text-brand-muted hover:bg-brand-navy/5"
            )}
          >
            {t("dayLabel", { day: dk })}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMainTab("lunch")}
          className={cn(
            "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold transition-apple",
            mainTab === "lunch"
              ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-navy ring-1 ring-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]"
              : "text-brand-muted hover:bg-brand-navy/5"
          )}
        >
          {t("lunchOverlapTab")}
        </button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onAddDay}
            disabled={dayKeys.length >= MAX_SCHEDULE_DAYS}
            className="rounded-[var(--radius-md)] border border-brand-navy/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50 dark:bg-black/20"
          >
            {t("addDay")}
          </button>
          {dayKey && dayKeys.length > MIN_SCHEDULE_DAYS ? (
            <button
              type="button"
              onClick={onRemoveDay}
              className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {t("removeDay")}
            </button>
          ) : null}
        </div>
      </div>

      {mainTab === "lunch" ? (
        <div className="space-y-4">
          <p className="text-sm text-brand-muted">{t("lunchOverlapHelp")}</p>
          {overlaps.length === 0 ? (
            <p className="text-sm text-brand-navy/80 rounded-lg border border-brand-navy/10 bg-white/60 px-3 py-2 dark:bg-black/20">
              {t("noLunchOverlaps")}
            </p>
          ) : (
            <ul className="space-y-2">
              {overlaps.map((o, i) => (
                <li
                  key={`${o.day}-${o.groupA}-${o.groupB}-${i}`}
                  className="rounded-lg border border-brand-navy/10 bg-white/70 px-3 py-2 text-sm dark:bg-black/25"
                >
                  <span className="font-semibold text-brand-navy">
                    {t("dayLabel", { day: o.day })} · {o.overlapStart}–{o.overlapEnd}
                  </span>
                  <span className="text-brand-muted"> ({t("overlapMinutes", { count: o.overlapMinutes })})</span>
                  <div className="mt-1 text-[0.8rem] text-brand-navy/90 leading-snug">
                    <span className="font-medium">{o.labelA}</span> ({o.lunchAStart}–{o.lunchAEnd}){" "}
                    <span className="text-brand-muted">{t("vs")}</span>{" "}
                    <span className="font-medium">{o.labelB}</span> ({o.lunchBStart}–{o.lunchBEnd})
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{t("groupsLabel")}</span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {cfg.groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroupId(g.id)}
                  className={cn(
                    "max-w-[11rem] truncate rounded-full border px-2.5 py-1 text-xs font-semibold transition-apple",
                    activeGroupId === g.id
                      ? "border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] text-brand-navy"
                      : "border-brand-navy/15 text-brand-muted hover:bg-brand-navy/5"
                  )}
                  title={g.name}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {activeGroup ? (
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
                {t("renameGroup")}
              </label>
              <input
                value={activeGroup.name}
                onChange={(e) => renameGroup(activeGroup.id, e.target.value)}
                className="max-w-md w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              />
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap gap-3 text-[0.7rem] text-brand-navy/90 dark:text-zinc-200">
            <span className="font-semibold uppercase tracking-wide text-brand-muted">{t("legendTitle")}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden />
              {t("legendSession")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden />
              {t("legendBreak")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#C2A878]" aria-hidden />
              {t("legendCeremony")}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-brand-navy/10">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-brand-navy/10 bg-brand-navy/[0.04] text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-2 py-2 w-[1%] whitespace-nowrap">{t("colStart")}</th>
                  <th className="px-2 py-2 w-[1%] whitespace-nowrap">{t("colEnd")}</th>
                  <th className="px-2 py-2 w-[1%] whitespace-nowrap">{t("colKind")}</th>
                  <th className="px-2 py-2">{t("colLabel")}</th>
                  <th className="px-2 py-2 w-[1%] text-center whitespace-nowrap">{t("colLunch")}</th>
                  <th className="px-2 py-2 w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-brand-muted">
                      {t("emptyDay")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-brand-navy/8 last:border-0 pl-0",
                        scheduleSlotRowClass(row.kind)
                      )}
                    >
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="time"
                          value={row.start}
                          onChange={(e) => dayKey && updateSlot(dayKey, activeGroup!.id, row.id, { start: e.target.value })}
                          className="mun-field w-[7.25rem] py-1 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="time"
                          value={row.end}
                          onChange={(e) => dayKey && updateSlot(dayKey, activeGroup!.id, row.id, { end: e.target.value })}
                          className="mun-field w-[7.25rem] py-1 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <select
                          value={row.kind}
                          onChange={(e) =>
                            dayKey &&
                            updateSlot(dayKey, activeGroup!.id, row.id, {
                              kind: e.target.value as EventScheduleBlockKind,
                            })
                          }
                          className="mun-field max-w-[9.5rem] py-1 text-xs"
                          aria-label={t("colKind")}
                        >
                          {EVENT_SCHEDULE_BLOCK_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {k === "session" ? t("kindSession") : k === "break" ? t("kindBreak") : t("kindCeremony")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          value={row.label}
                          onChange={(e) =>
                            dayKey && updateSlot(dayKey, activeGroup!.id, row.id, { label: e.target.value })
                          }
                          placeholder={t("blockPlaceholder")}
                          className="mun-field w-full py-1 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={row.isLunch}
                          onChange={(e) =>
                            dayKey && updateSlot(dayKey, activeGroup!.id, row.id, { isLunch: e.target.checked })
                          }
                          aria-label={t("lunchCheckboxAria")}
                          className="h-4 w-4 accent-[color:var(--accent)]"
                        />
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <button
                          type="button"
                          onClick={() => removeBlock(row.id)}
                          className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                        >
                          {t("remove")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addBlock}
              disabled={!dayKey || !activeGroup}
              className="rounded-lg border border-brand-navy/15 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50 dark:bg-black/20"
            >
              {t("addBlock")}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-2 border-t border-brand-navy/10 pt-4">
            <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-brand-muted">{t("newGroupName")}</label>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t("newGroupPlaceholder")}
                className="px-3 py-2 rounded-lg border border-brand-navy/15"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const name = newGroupName.trim() || t("defaultNewGroupName");
                setCfg((c) => addGroupToConfig(c, name));
                setNewGroupName("");
              }}
              className="rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 dark:bg-black/20"
            >
              {t("addGroup")}
            </button>
            {activeGroup && cfg.groups.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(t("confirmRemoveGroup", { name: activeGroup.name }))) return;
                  const gid = activeGroup.id;
                  setCfg((c) => removeGroupFromConfig(c, gid));
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {t("removeGroup")}
              </button>
            ) : null}
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 dark:bg-white dark:text-brand-navy"
        >
          {pending ? t("saving") : t("saveSchedule")}
        </button>
        <button
          type="button"
          onClick={onResetDefaults}
          className="rounded-lg border border-brand-navy/15 px-3 py-2 text-sm text-brand-muted hover:bg-brand-navy/5"
        >
          {t("resetTemplate")}
        </button>
        {message?.error ? (
          <p className="text-sm text-red-700 dark:text-red-400">{message.error}</p>
        ) : message?.ok ? (
          <p className="text-sm text-brand-navy">{t("saved")}</p>
        ) : null}
      </div>
    </div>
  );
}
