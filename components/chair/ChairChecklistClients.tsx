"use client";

import { useCallback, useMemo } from "react";
import {
  CHAIR_FLOW_ITEMS,
  CHAIR_PREP_SECTIONS,
  type ChairPrepSection,
} from "@/lib/chair-dashboard-checklists";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { useCommitteeSyncedState } from "@/lib/hooks/useCommitteeSyncedState";

function parseChecklistPayload(raw: unknown): Set<string> {
  if (!raw || typeof raw !== "object") return new Set();
  const ids = (raw as { checkedIds?: unknown }).checkedIds;
  if (!Array.isArray(ids)) return new Set();
  return new Set(ids.filter((x): x is string => typeof x === "string"));
}

function parseLegacyChecklistArray(raw: string | null): Set<string> | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return null;
  }
}

const surfaceCard =
  "rounded-xl border border-slate-200/90 bg-white p-4 text-slate-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100";

export function ChairPrepChecklistClient({
  conferenceId,
  crisisPrepEnabled,
}: {
  conferenceId: string;
  /** FWC / UNSC / HSC only — hides the “Crisis (if applicable)” prep block. */
  crisisPrepEnabled: boolean;
}) {
  const legacyKey = useMemo(() => `intermun.chair.prep.${conferenceId}.v1`, [conferenceId]);
  const loadLegacy = useCallback(
    () => parseLegacyChecklistArray(typeof window !== "undefined" ? localStorage.getItem(legacyKey) : null),
    [legacyKey]
  );

  const { value: checked, setValue: persist, ready } = useCommitteeSyncedState({
    conferenceId,
    stateKey: COMMITTEE_SYNCED_STATE_KEYS.CHAIR_PREP_CHECKLIST,
    defaultValue: new Set<string>(),
    parsePayload: parseChecklistPayload,
    toPayload: (s) => ({ checkedIds: [...s] }),
    hasMeaningfulData: (s) => s.size > 0,
    loadLegacy,
  });

  const prepSections = useMemo(
    () =>
      crisisPrepEnabled ? CHAIR_PREP_SECTIONS : CHAIR_PREP_SECTIONS.filter((s) => s.id !== "crisis"),
    [crisisPrepEnabled]
  );

  const allIds = useMemo(() => prepSections.flatMap((s) => s.items.map((i) => i.id)), [prepSections]);
  const done = useMemo(() => allIds.filter((id) => checked.has(id)).length, [allIds, checked]);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(checked);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [checked, persist]
  );

  const reset = useCallback(() => {
    persist(new Set());
  }, [persist]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {ready ? (
            <>
              {done} / {allIds.length} complete · synced for this committee
            </>
          ) : (
            "Loading…"
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Reset checklist
        </button>
      </div>

      <div className="space-y-6">
        {prepSections.map((section) => (
          <PrepSectionBlock key={section.id} section={section} checked={checked} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}

function PrepSectionBlock({
  section,
  checked,
  onToggle,
}: {
  section: ChairPrepSection;
  checked: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className={surfaceCard}>
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">
        {section.title}
      </h3>
      <ul className="mt-3 space-y-2">
        {section.items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1 text-sm leading-snug hover:bg-slate-50 dark:hover:bg-zinc-800/50">
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => onToggle(item.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChairFlowChecklistClient({ conferenceId }: { conferenceId: string }) {
  const legacyKey = useMemo(() => `intermun.chair.flow.${conferenceId}.v1`, [conferenceId]);
  const loadLegacy = useCallback(
    () => parseLegacyChecklistArray(typeof window !== "undefined" ? localStorage.getItem(legacyKey) : null),
    [legacyKey]
  );

  const { value: checked, setValue: persist, ready } = useCommitteeSyncedState({
    conferenceId,
    stateKey: COMMITTEE_SYNCED_STATE_KEYS.CHAIR_FLOW_CHECKLIST,
    defaultValue: new Set<string>(),
    parsePayload: parseChecklistPayload,
    toPayload: (s) => ({ checkedIds: [...s] }),
    hasMeaningfulData: (s) => s.size > 0,
    loadLegacy,
  });

  const allIds = CHAIR_FLOW_ITEMS.map((i) => i.id);
  const done = useMemo(() => allIds.filter((id) => checked.has(id)).length, [allIds, checked]);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(checked);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [checked, persist]
  );

  const reset = useCallback(() => {
    persist(new Set());
  }, [persist]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {ready ? (
            <>
              {done} / {allIds.length} complete · synced for this committee
            </>
          ) : (
            "Loading…"
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Reset checklist
        </button>
      </div>

      <div className={surfaceCard}>
        <ul className="space-y-2 text-sm text-slate-800 dark:text-zinc-100">
          {CHAIR_FLOW_ITEMS.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg py-0.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
