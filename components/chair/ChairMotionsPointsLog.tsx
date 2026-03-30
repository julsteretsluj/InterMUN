"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { CHAIR_MOTIONS_POINTS_PRESETS } from "@/lib/chair-motions-points-presets";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { useCommitteeSyncedState } from "@/lib/hooks/useCommitteeSyncedState";

export type MotionsLogEntry = {
  id: string;
  kind: "motion" | "point";
  text: string;
  starred: boolean;
  createdAt: string;
};

function coerceLogEntry(row: unknown): MotionsLogEntry | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (r.kind !== "motion" && r.kind !== "point") return null;
  if (typeof r.text !== "string") return null;
  if (typeof r.createdAt !== "string") return null;
  return {
    id: r.id,
    kind: r.kind,
    text: r.text,
    createdAt: r.createdAt,
    starred: r.starred === true,
  };
}

function parseLogPayload(raw: unknown): MotionsLogEntry[] {
  const mapList = (arr: unknown[]) =>
    arr.map(coerceLogEntry).filter((x): x is MotionsLogEntry => x != null);
  if (Array.isArray(raw)) {
    return mapList(raw);
  }
  if (raw && typeof raw === "object" && "entries" in raw) {
    const e = (raw as { entries: unknown }).entries;
    if (Array.isArray(e)) return mapList(e);
  }
  return [];
}

function loadLegacyLog(storageKey: string): MotionsLogEntry[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const entries = parseLogPayload(parsed);
    return entries.length > 0 ? entries : null;
  } catch {
    return null;
  }
}

export function ChairMotionsPointsLog({ conferenceId }: { conferenceId: string }) {
  const storageKey = `intermun.chair.motionsLog.${conferenceId}.v1`;
  const loadLegacy = useCallback(
    () => (typeof window !== "undefined" ? loadLegacyLog(storageKey) : null),
    [storageKey]
  );

  const { value: entries, setValue: persist, ready } = useCommitteeSyncedState({
    conferenceId,
    stateKey: COMMITTEE_SYNCED_STATE_KEYS.MOTIONS_LOG,
    defaultValue: [] as MotionsLogEntry[],
    parsePayload: parseLogPayload,
    toPayload: (list) => ({ entries: list }),
    hasMeaningfulData: (list) => list.length > 0,
    loadLegacy,
  });

  const [kind, setKind] = useState<"motion" | "point">("motion");
  const [draft, setDraft] = useState("");

  const addEntry = useCallback(
    (text: string, entryKind: "motion" | "point") => {
      const t = text.trim();
      if (!t) return;
      const row: MotionsLogEntry = {
        id: crypto.randomUUID(),
        kind: entryKind,
        text: t,
        starred: false,
        createdAt: new Date().toISOString(),
      };
      persist([row, ...entries]);
    },
    [entries, persist]
  );

  const add = useCallback(() => {
    addEntry(draft, kind);
    setDraft("");
  }, [draft, kind, addEntry]);

  const remove = useCallback(
    (id: string) => {
      persist(entries.filter((e) => e.id !== id));
    },
    [entries, persist]
  );

  const toggleStar = useCallback(
    (id: string) => {
      persist(entries.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)));
    },
    [entries, persist]
  );

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt)
      ),
    [entries]
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Record and star motions and points — synced for all chairs on this committee.
      </p>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
        <p className="font-medium">Informal log (shared across devices)</p>
        <p className="mt-1 text-amber-900/85 dark:text-amber-200/90">
          Formal procedural votes and the motion floor are in{" "}
          <Link
            href="/chair/session/motions"
            className="font-semibold underline decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-400"
          >
            Formal motions
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKind("motion")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              kind === "motion"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            📜 Motion
          </button>
          <button
            type="button"
            onClick={() => setKind("point")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              kind === "point"
                ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            • Point
          </button>
        </div>
        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Text
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="e.g. Motion to open the speaker list"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            ➕ Add
          </button>
        </div>

        <details className="mt-4 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 dark:border-zinc-600 dark:bg-zinc-800/40">
          <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-zinc-200">
            Preset options
          </summary>
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
            Tap a preset to add it to the log with the correct motion or point type.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHAIR_MOTIONS_POINTS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addEntry(p.logText, p.kind)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-slate-800 hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-blue-500/40 dark:hover:bg-blue-950/30"
              >
                {p.buttonLabel}
              </button>
            ))}
          </div>
        </details>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">📋 Log</h3>
        {!ready ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">No entries yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sorted.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <button
                  type="button"
                  onClick={() => toggleStar(e.id)}
                  className="mt-0.5 shrink-0 text-amber-500 hover:text-amber-600 dark:text-amber-400"
                  aria-label={e.starred ? "Unstar" : "Star"}
                >
                  <Star className={`h-4 w-4 ${e.starred ? "fill-current" : ""}`} strokeWidth={1.75} />
                </button>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    {e.kind === "motion" ? "Motion" : "Point"}
                  </span>
                  <p className="text-slate-900 dark:text-zinc-100">{e.text}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  className="shrink-0 text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
