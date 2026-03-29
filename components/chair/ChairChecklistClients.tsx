"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHAIR_FLOW_ITEMS,
  CHAIR_PREP_SECTIONS,
  type ChairPrepSection,
} from "@/lib/chair-dashboard-checklists";

function parseSet(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function useChecklistPersistence(storageKey: string) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChecked(parseSet(typeof window !== "undefined" ? localStorage.getItem(storageKey) : null));
    setReady(true);
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      setChecked(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore quota */
      }
    },
    [storageKey]
  );

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

  return { checked, toggle, reset, ready };
}

const surfaceCard =
  "rounded-xl border border-slate-200/90 bg-white p-4 text-slate-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100";

export function ChairPrepChecklistClient({ conferenceId }: { conferenceId: string }) {
  const storageKey = useMemo(() => `intermun.chair.prep.${conferenceId}.v1`, [conferenceId]);
  const { checked, toggle, reset, ready } = useChecklistPersistence(storageKey);

  const allIds = useMemo(
    () => CHAIR_PREP_SECTIONS.flatMap((s) => s.items.map((i) => i.id)),
    []
  );
  const done = useMemo(() => allIds.filter((id) => checked.has(id)).length, [allIds, checked]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {ready ? (
            <>
              {done} / {allIds.length} complete
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
        {CHAIR_PREP_SECTIONS.map((section) => (
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
  const storageKey = useMemo(() => `intermun.chair.flow.${conferenceId}.v1`, [conferenceId]);
  const { checked, toggle, reset, ready } = useChecklistPersistence(storageKey);

  const allIds = CHAIR_FLOW_ITEMS.map((i) => i.id);
  const done = useMemo(() => allIds.filter((id) => checked.has(id)).length, [allIds, checked]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          {ready ? (
            <>
              {done} / {allIds.length} steps ticked
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
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-800 dark:text-zinc-100">
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
        </ol>
      </div>
    </div>
  );
}
