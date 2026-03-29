"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

export type MotionsLogEntry = {
  id: string;
  kind: "motion" | "point";
  text: string;
  starred: boolean;
  createdAt: string;
};

function loadLog(key: string): MotionsLogEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is MotionsLogEntry =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as MotionsLogEntry).id === "string" &&
        ((row as MotionsLogEntry).kind === "motion" || (row as MotionsLogEntry).kind === "point") &&
        typeof (row as MotionsLogEntry).text === "string"
    );
  } catch {
    return [];
  }
}

export function ChairMotionsPointsLog({ conferenceId }: { conferenceId: string }) {
  const storageKey = useMemo(() => `intermun.chair.motionsLog.${conferenceId}.v1`, [conferenceId]);
  const [entries, setEntries] = useState<MotionsLogEntry[]>([]);
  const [kind, setKind] = useState<"motion" | "point">("motion");
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(loadLog(storageKey));
    setReady(true);
  }, [storageKey]);

  const persist = useCallback(
    (next: MotionsLogEntry[]) => {
      setEntries(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const add = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    const row: MotionsLogEntry = {
      id: crypto.randomUUID(),
      kind,
      text: t,
      starred: false,
      createdAt: new Date().toISOString(),
    };
    persist([row, ...entries]);
    setDraft("");
  }, [draft, kind, entries, persist]);

  const remove = useCallback(
    (id: string) => {
      persist(entries.filter((e) => e.id !== id));
    },
    [entries, persist]
  );

  const toggleStar = useCallback(
    (id: string) => {
      persist(
        entries.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
      );
    },
    [entries, persist]
  );

  const sorted = useMemo(
    () => [...entries].sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt)),
    [entries]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
        <p className="font-medium">Quick log (this device only)</p>
        <p className="mt-1 text-amber-900/85 dark:text-amber-200/90">
          Use this for informal motions and points during session. Formal procedural votes, tallies, and the motion
          floor live in{" "}
          <Link href="/chair/session/motions" className="font-semibold underline decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-400">
            Session → Motions
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
            Motion
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
            Point
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
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Add
        </button>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">Log</h3>
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
