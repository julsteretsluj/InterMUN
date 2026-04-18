"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { useCommitteeSyncedState } from "@/lib/hooks/useCommitteeSyncedState";
import { ExternalLink, Mic2, Search, Smile, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortAllocationsByDisplayCountry } from "@/lib/allocation-display-order";
import { type RollAttendance, rollAttendanceShortLabel } from "@/lib/roll-attendance";
import { createClient } from "@/lib/supabase/client";
import { addAllocationToSpeakerQueue, fetchSpeakerQueue } from "@/lib/speaker-queue";
import { ChairSpeakerQueuePanel } from "@/components/chair/ChairSpeakerQueuePanel";

export type DigitalRoomAllocation = {
  id: string;
  country: string;
  user_id: string | null;
  userRole?: string | null;
};

type PlacardFlags = {
  compliment?: boolean;
  concern?: boolean;
  reminder?: string;
};

function storageKey(conferenceId: string) {
  return `intermun.chair.digitalRoom.${conferenceId}.v1`;
}

function loadLegacyFlags(conferenceId: string): Record<string, PlacardFlags> | null {
  try {
    const raw = localStorage.getItem(storageKey(conferenceId));
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    return p as Record<string, PlacardFlags>;
  } catch {
    return null;
  }
}

function parseFlagsPayload(raw: unknown): Record<string, PlacardFlags> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, PlacardFlags>;
}

function flagsMeaningful(f: Record<string, PlacardFlags>): boolean {
  return Object.keys(f).length > 0;
}

export function ChairDigitalRoomClient({
  conferenceId,
  committeeLine,
  allocations,
  rollAttendanceByAllocationId,
  isCrisisCommittee = false,
}: {
  conferenceId: string;
  committeeLine: string;
  allocations: DigitalRoomAllocation[];
  rollAttendanceByAllocationId: Record<string, RollAttendance>;
  isCrisisCommittee?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const loadLegacy = useCallback(
    () => (typeof window !== "undefined" ? loadLegacyFlags(conferenceId) : null),
    [conferenceId]
  );
  const {
    value: flagsByAlloc,
    setValue: persist,
    ready,
  } = useCommitteeSyncedState({
    conferenceId,
    stateKey: COMMITTEE_SYNCED_STATE_KEYS.DIGITAL_ROOM_FLAGS,
    defaultValue: {},
    parsePayload: parseFlagsPayload,
    toPayload: (x) => x,
    hasMeaningfulData: flagsMeaningful,
    loadLegacy,
    debounceMs: 500,
  });
  const [expandedReminderId, setExpandedReminderId] = useState<string | null>(null);
  const [speakerPlacardMsg, setSpeakerPlacardMsg] = useState<string | null>(null);
  const [addingSpeakerId, setAddingSpeakerId] = useState<string | null>(null);

  const toggle = useCallback(
    (allocationId: string, key: "compliment" | "concern") => {
      const prev = flagsByAlloc[allocationId] ?? {};
      const nextVal = !prev[key];
      const next = {
        ...flagsByAlloc,
        [allocationId]: { ...prev, [key]: nextVal },
      };
      persist(next);
    },
    [flagsByAlloc, persist]
  );

  const clearAllFlags = useCallback(() => {
    if (
      !window.confirm(
        "Clear compliment, concern, and reminder notes for every placard? This updates the shared committee copy."
      )
    )
      return;
    persist({});
  }, [persist]);

  const sorted = useMemo(
    () => sortAllocationsByDisplayCountry(allocations.map((a) => ({ ...a, country: a.country || "—" }))),
    [allocations]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((a) => (a.country || "").toLowerCase().includes(q));
  }, [sorted, query]);

  const speakerAllocOptions = useMemo(
    () => sorted.map((a) => ({ id: a.id, country: a.country || "—", userRole: a.userRole ?? null })),
    [sorted]
  );

  useEffect(() => {
    if (!speakerPlacardMsg) return;
    const t = window.setTimeout(() => setSpeakerPlacardMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [speakerPlacardMsg]);

  const addPlacardToSpeakerList = useCallback(
    async (allocationId: string, country: string) => {
      setAddingSpeakerId(allocationId);
      try {
        const rows = await fetchSpeakerQueue(supabase, conferenceId);
        const result = await addAllocationToSpeakerQueue(
          supabase,
          conferenceId,
          allocationId,
          country,
          rows
        );
        setSpeakerPlacardMsg(
          result.ok ? `${country} added to speaker list.` : result.message
        );
      } finally {
        setAddingSpeakerId(null);
      }
    },
    [supabase, conferenceId]
  );

  const flaggedCount = useMemo(() => {
    let n = 0;
    for (const a of sorted) {
      const f = flagsByAlloc[a.id];
      if (f?.compliment || f?.concern || (f?.reminder?.trim().length ?? 0) > 0) n += 1;
    }
    return n;
  }, [sorted, flagsByAlloc]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <p className="text-sm text-slate-700 dark:text-zinc-200">
          <span className="font-semibold text-slate-900 dark:text-zinc-50">{committeeLine}</span>
          <span className="text-slate-500 dark:text-zinc-400">
            {" "}
            — chair notes sync for this committee (all chair accounts and devices).
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href="/committee-room"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Open full committee room
            <ExternalLink className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
          </Link>
          <Link
            href="/chair/allocation-matrix"
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Delegates matrix
          </Link>
          <button
            type="button"
            onClick={clearAllFlags}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Clear all chair notes
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {speakerPlacardMsg ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200">
            {speakerPlacardMsg}
          </p>
        ) : null}
        <ChairSpeakerQueuePanel
          conferenceId={conferenceId}
          allocations={speakerAllocOptions}
          variant="digital-room"
          isCrisisCommittee={isCrisisCommittee}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          {allocations.length} placards · {flaggedCount} with chair notes · Roll recorded for{" "}
          {Object.keys(rollAttendanceByAllocationId).length}
        </p>
      </div>

      {!ready ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400">No delegations match your search.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => {
            const f = flagsByAlloc[a.id] ?? {};
            const att = rollAttendanceByAllocationId[a.id];
            const rollLabel = att !== undefined ? rollAttendanceShortLabel(att) : "—";
            const rollClass =
              att === "present_voting"
                ? "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
                : att === "present_abstain"
                  ? "bg-amber-100 text-amber-950 dark:bg-amber-950/45 dark:text-amber-100"
                  : att === "absent"
                    ? "bg-rose-100 text-rose-900 dark:bg-rose-950/45 dark:text-rose-200"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400";

            return (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{a.country || "—"}</h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                          rollClass
                        )}
                      >
                        Roll {rollLabel}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                          a.user_id
                            ? "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
                            : "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200"
                        )}
                      >
                        {a.user_id ? "Linked account" : "Vacant placard"}
                      </span>
                    </div>
                    {a.user_id ? (
                      <Link
                        href={`/committee-room/person/${a.user_id}`}
                        className="mt-1 inline-block text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        Delegate profile →
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(a.id, "compliment")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                        f.compliment
                          ? "border-blue-400 bg-blue-50 text-blue-900 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-100"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      )}
                    >
                      <Smile className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      Compliment
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(a.id, "concern")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                        f.concern
                          ? "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/45 dark:text-amber-100"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      )}
                    >
                      <TriangleAlert className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      Concern
                    </button>
                    <button
                      type="button"
                      disabled={addingSpeakerId === a.id}
                      onClick={() => void addPlacardToSpeakerList(a.id, a.country || "—")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Mic2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      {addingSpeakerId === a.id ? "Adding…" : "Add to speaker list"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedReminderId((id) => (id === a.id ? null : a.id))}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition",
                        expandedReminderId === a.id || f.reminder
                          ? "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-100"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      )}
                    >
                      Reminder
                    </button>
                  </div>
                </div>
                {f.reminder && expandedReminderId !== a.id ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-zinc-800/80 dark:text-zinc-200">
                    {f.reminder}
                  </p>
                ) : null}
                {expandedReminderId === a.id ? (
                  <label className="mt-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    Private reminder (chairs only, synced)
                    <textarea
                      value={f.reminder ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        const prev = flagsByAlloc[a.id] ?? {};
                        persist({
                          ...flagsByAlloc,
                          [a.id]: { ...prev, reminder: v.length > 0 ? v : undefined },
                        });
                      }}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="e.g. Thank France for keeping time"
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
