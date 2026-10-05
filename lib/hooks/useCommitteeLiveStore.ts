// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export type ConferenceTimerRow = {
  id: string;
  conference_id: string | null;
  current_speaker: string | null;
  next_speaker: string | null;
  time_left_seconds: number;
  total_time_seconds: number;
  vote_item_id?: string | null;
  per_speaker_mode?: boolean | null;
  is_running?: boolean | null;
  floor_label?: string | null;
  current_pause_reason?: string | null;
  /** Wall-clock end while running — source of truth for remaining seconds. */
  countdown_ends_at?: string | null;
  updated_at?: string | null;
};

/** Prefer the newer timers row when an in-flight fetch races an optimistic Start/Pause. */
function shouldApplyTimerRow(
  current: ConferenceTimerRow | null,
  next: ConferenceTimerRow | null
): boolean {
  // Empty fetches must not wipe an optimistic Start (replica lag / 0-row race).
  // Realtime DELETE clears the row explicitly before calling this helper.
  if (!next) return current == null;
  if (!current?.updated_at || !next.updated_at) {
    // Missing timestamps: still protect an optimistic Start from a paused snapshot.
    if (current?.is_running === true && next.is_running === false) return false;
    return true;
  }
  const curMs = Date.parse(current.updated_at);
  const nextMs = Date.parse(next.updated_at);
  if (Number.isNaN(curMs) || Number.isNaN(nextMs)) return true;
  if (nextMs > curMs) return true;
  if (nextMs < curMs) return false;
  // Equal timestamps: never let a paused snapshot clobber an optimistic Start.
  if (current.is_running === true && next.is_running === false) return false;
  // Prefer a row that carries a durable countdown end when otherwise equal.
  if (!current.countdown_ends_at && next.countdown_ends_at) return true;
  if (current.countdown_ends_at && !next.countdown_ends_at && current.is_running === true) {
    return false;
  }
  return true;
}

export type ProcedureLiveRow = {
  state?: string | null;
  current_vote_item_id?: string | null;
  committee_session_started_at?: string | null;
  committee_session_duration_seconds?: number | null;
  committee_session_ends_at?: string | null;
};

type StoreEntry<T> = {
  refCount: number;
  value: T | null;
  listeners: Set<() => void>;
  channel: ReturnType<SupabaseClient["channel"]> | null;
  loading: boolean;
};

type TimerStoreEntry = StoreEntry<ConferenceTimerRow> & {
  /** Bumped on optimistic patches so in-flight refreshes cannot clobber Start/Pause. */
  epoch: number;
  /**
   * Bumped when the chair starts/restarts the clock so countdown anchors reset even
   * when DB `time_left_seconds` / `is_running` are unchanged (spent UI countdown).
   */
  runGeneration: number;
};

type CommitteeLiveStores = {
  procedureById: Map<string, StoreEntry<ProcedureLiveRow>>;
  timerById: Map<string, TimerStoreEntry>;
};

/**
 * Plain window bus — the only SoT for the visible timer row.
 * Webpack can evaluate this module twice; Maps on globalThis still diverged in practice
 * (Start wrote DB + form state while Floor's Map stayed loading/null). A versioned
 * record on `window` cannot fork across chunks in the same document.
 */
type TimerWindowBus = {
  version: number;
  rows: Record<string, ConferenceTimerRow | null>;
  runGeneration: Record<string, number>;
  epochs: Record<string, number>;
  listeners: Set<() => void>;
};

const TIMER_BUS_KEY = "__intermunTimerBus_v1";

function getTimerBus(): TimerWindowBus {
  const root =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : (globalThis as unknown as Record<string, unknown>);
  let bus = root[TIMER_BUS_KEY] as TimerWindowBus | undefined;
  if (!bus) {
    bus = {
      version: 0,
      rows: {},
      runGeneration: {},
      epochs: {},
      listeners: new Set(),
    };
    root[TIMER_BUS_KEY] = bus;
  }
  return bus;
}

function emitTimerBus() {
  const bus = getTimerBus();
  bus.version += 1;
  bus.listeners.forEach((listener) => listener());
}

function readTimerBusRow(conferenceId: string): ConferenceTimerRow | null {
  const bus = getTimerBus();
  return Object.prototype.hasOwnProperty.call(bus.rows, conferenceId)
    ? bus.rows[conferenceId] ?? null
    : null;
}

function writeTimerBusRow(
  conferenceId: string,
  row: ConferenceTimerRow | null,
  opts?: { bumpRun?: boolean; bumpEpoch?: boolean }
) {
  const bus = getTimerBus();
  bus.rows[conferenceId] = row;
  if (opts?.bumpEpoch !== false) {
    bus.epochs[conferenceId] = (bus.epochs[conferenceId] ?? 0) + 1;
  }
  if (opts?.bumpRun) {
    bus.runGeneration[conferenceId] = (bus.runGeneration[conferenceId] ?? 0) + 1;
  }
  emitTimerBus();
}

/**
 * Webpack/Next can evaluate this module more than once in the browser. Module-local
 * Maps then diverge. Keep Maps on globalThis as a secondary channel/realtime host,
 * but always publish visible rows through the window timer bus above.
 */
function getCommitteeLiveStores(): CommitteeLiveStores {
  const g = globalThis as typeof globalThis & {
    __intermunCommitteeLiveStores?: CommitteeLiveStores;
  };
  if (!g.__intermunCommitteeLiveStores) {
    g.__intermunCommitteeLiveStores = {
      procedureById: new Map(),
      timerById: new Map(),
    };
  }
  return g.__intermunCommitteeLiveStores;
}

function procedureById() {
  return getCommitteeLiveStores().procedureById;
}

function timerById() {
  return getCommitteeLiveStores().timerById;
}

function getBrowserClient(): SupabaseClient {
  return createBrowserClient() as unknown as SupabaseClient;
}

function emit<T>(entry: StoreEntry<T>) {
  entry.listeners.forEach((listener) => listener());
}

function acquireProcedure(conferenceId: string): StoreEntry<ProcedureLiveRow> {
  const map = procedureById();
  let entry = map.get(conferenceId);
  if (entry) {
    entry.refCount += 1;
    return entry;
  }

  entry = {
    refCount: 1,
    value: null,
    listeners: new Set(),
    channel: null,
    loading: true,
  };
  map.set(conferenceId, entry);

  const supabase = getBrowserClient();
  void supabase
    .from("procedure_states")
    .select(
      "state, current_vote_item_id, committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at"
    )
    .eq("conference_id", conferenceId)
    .maybeSingle()
    .then(({ data, error }) => {
      const current = procedureById().get(conferenceId);
      if (!current) return;
      const errorMessage = String(error?.message ?? "");
      const missingSessionColumns =
        /schema cache/i.test(errorMessage) &&
        /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at/i.test(
          errorMessage
        );
      if (missingSessionColumns) {
        current.value = (data as ProcedureLiveRow | null) ?? {
          state: null,
          current_vote_item_id: null,
        };
      } else {
        current.value = (data as ProcedureLiveRow | null) ?? null;
      }
      current.loading = false;
      emit(current);
    });

  entry.channel = supabase
    .channel(`committee-live-procedure-${conferenceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "procedure_states",
        filter: `conference_id=eq.${conferenceId}`,
      },
      (payload) => {
        const current = procedureById().get(conferenceId);
        if (!current) return;
        current.value = (payload.new as ProcedureLiveRow | null) ?? null;
        current.loading = false;
        emit(current);
      }
    )
    .subscribe();

  return entry;
}

function releaseProcedure(conferenceId: string) {
  const map = procedureById();
  const entry = map.get(conferenceId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  if (entry.channel) {
    void getBrowserClient().removeChannel(entry.channel);
  }
  map.delete(conferenceId);
}

function publishTimerEntry(conferenceId: string, entry: TimerStoreEntry, opts?: { bumpRun?: boolean }) {
  writeTimerBusRow(conferenceId, entry.value, {
    bumpRun: opts?.bumpRun,
    bumpEpoch: false,
  });
  // Keep bus epoch in lockstep with Map epoch for refresh races.
  getTimerBus().epochs[conferenceId] = entry.epoch;
  emit(entry);
  emitTimerBus();
}

function acquireTimer(conferenceId: string): TimerStoreEntry {
  const map = timerById();
  let entry = map.get(conferenceId);
  if (entry) {
    entry.refCount += 1;
    return entry;
  }

  entry = {
    refCount: 1,
    value: readTimerBusRow(conferenceId),
    listeners: new Set(),
    channel: null,
    loading: true,
    epoch: getTimerBus().epochs[conferenceId] ?? 0,
    runGeneration: getTimerBus().runGeneration[conferenceId] ?? 0,
  };
  // Bus already has a Start/Pause row — do not look "unloaded".
  if (entry.value) entry.loading = false;
  map.set(conferenceId, entry);

  const supabase = getBrowserClient();
  void Promise.resolve(
    supabase.from("timers").select("*").eq("conference_id", conferenceId).maybeSingle()
  )
    .then(({ data, error }) => {
      const current = timerById().get(conferenceId);
      if (!current) return;
      // Optimistic patches / bus writes may finish before this fetch; never clobber them.
      if (!current.loading) return;
      if (error) {
        current.loading = false;
        publishTimerEntry(conferenceId, current);
        return;
      }
      const next = (data as ConferenceTimerRow | null) ?? null;
      // Prefer an already-published bus row (Start) over a slow empty/paused fetch.
      const busRow = readTimerBusRow(conferenceId);
      if (busRow && !shouldApplyTimerRow(busRow, next)) {
        current.value = busRow;
        current.loading = false;
        publishTimerEntry(conferenceId, current);
        return;
      }
      current.value = next;
      current.loading = false;
      publishTimerEntry(conferenceId, current);
    })
    .catch(() => {
      const current = timerById().get(conferenceId);
      if (!current || !current.loading) return;
      current.loading = false;
      publishTimerEntry(conferenceId, current);
    });

  entry.channel = supabase
    .channel(`committee-live-timer-${conferenceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "timers",
        filter: `conference_id=eq.${conferenceId}`,
      },
      (payload) => {
        const current = timerById().get(conferenceId);
        if (!current) return;
        if (payload.eventType === "DELETE") {
          current.value = null;
        } else {
          const next = (payload.new as ConferenceTimerRow | null) ?? null;
          const busRow = readTimerBusRow(conferenceId);
          const baseline = busRow ?? current.value;
          if (!shouldApplyTimerRow(baseline, next)) return;
          current.value = next;
        }
        current.loading = false;
        publishTimerEntry(conferenceId, current);
      }
    )
    .subscribe();

  return entry;
}

function releaseTimer(conferenceId: string) {
  const map = timerById();
  const entry = map.get(conferenceId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  if (entry.channel) {
    void getBrowserClient().removeChannel(entry.channel);
  }
  map.delete(conferenceId);
}

/** Shared procedure_states row — one realtime channel per conference id. */
export function useSharedProcedureState(conferenceId: string | null): ProcedureLiveRow | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!conferenceId) return () => {};
      const entry = acquireProcedure(conferenceId);
      entry.listeners.add(onStoreChange);
      return () => {
        entry.listeners.delete(onStoreChange);
        releaseProcedure(conferenceId);
      };
    },
    () => (conferenceId ? procedureById().get(conferenceId)?.value ?? null : null),
    () => null
  );
}

/** Shared timers row — window bus first, Map/realtime as feeder. */
export function useSharedConferenceTimerRow(conferenceId: string | null): ConferenceTimerRow | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!conferenceId) return () => {};
      const bus = getTimerBus();
      bus.listeners.add(onStoreChange);
      const entry = acquireTimer(conferenceId);
      entry.listeners.add(onStoreChange);
      return () => {
        bus.listeners.delete(onStoreChange);
        entry.listeners.delete(onStoreChange);
        releaseTimer(conferenceId);
      };
    },
    () => {
      if (!conferenceId) return null;
      // Bus is authoritative for Start/Pause paint across duplicated module graphs.
      if (Object.prototype.hasOwnProperty.call(getTimerBus().rows, conferenceId)) {
        return readTimerBusRow(conferenceId);
      }
      return timerById().get(conferenceId)?.value ?? null;
    },
    () => null
  );
}

/** Refresh procedure snapshot after local chair actions (same channel stays open). */
export function refreshSharedProcedureState(conferenceId: string) {
  const entry = procedureById().get(conferenceId);
  if (!entry) return;
  const supabase = getBrowserClient();
  void supabase
    .from("procedure_states")
    .select(
      "state, current_vote_item_id, committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at"
    )
    .eq("conference_id", conferenceId)
    .maybeSingle()
    .then(({ data }) => {
      const current = procedureById().get(conferenceId);
      if (!current) return;
      current.value = (data as ProcedureLiveRow | null) ?? null;
      emit(current);
    });
}

/**
 * Instant local timer update for chair start/pause/advance before the network round-trip.
 * Seeds the shared store when nothing has subscribed yet (deferred floor status bar),
 * so Start still paints a countdown as soon as widgets mount.
 *
 * Pass `restartCountdown: true` from Start/resume so the wall-clock anchor resets even
 * when `time_left_seconds` and `is_running` are unchanged (UI had already counted to 0).
 */
export function applyOptimisticTimerPatch(
  conferenceId: string,
  patch: Partial<ConferenceTimerRow> & { restartCountdown?: boolean }
) {
  let entry = timerById().get(conferenceId);
  if (!entry) {
    // Start can race the deferred floor status bar. Seed the shared store so the
    // countdown is ready the moment FloorStatusBar / Speakers subscribe.
    entry = acquireTimer(conferenceId);
  }
  const { restartCountdown, ...rowPatch } = patch;
  const busBase = readTimerBusRow(conferenceId);
  const base: ConferenceTimerRow = entry.value ?? busBase ?? {
    id: `optimistic-${conferenceId}`,
    conference_id: conferenceId,
    current_speaker: null,
    next_speaker: null,
    time_left_seconds: 60,
    total_time_seconds: 60,
    is_running: false,
    per_speaker_mode: true,
  };
  const nextLeft =
    rowPatch.time_left_seconds != null
      ? Math.round(Number(rowPatch.time_left_seconds))
      : Math.round(Number(base.time_left_seconds ?? 0));
  const baseLeft = Math.round(Number(base.time_left_seconds ?? 0));
  const starting = rowPatch.is_running === true && base.is_running !== true;
  const rewritingLeft = rowPatch.is_running === true && nextLeft !== baseLeft;
  const bumpRun = Boolean(restartCountdown || starting || rewritingLeft);
  if (bumpRun) {
    entry.runGeneration += 1;
  }
  entry.epoch += 1;
  entry.value = {
    ...base,
    ...rowPatch,
    conference_id: conferenceId,
    // Stamp so a slower realtime payload cannot clobber Start/Pause.
    updated_at: rowPatch.updated_at ?? new Date().toISOString(),
  };
  entry.loading = false;
  writeTimerBusRow(conferenceId, entry.value, { bumpRun, bumpEpoch: false });
  getTimerBus().epochs[conferenceId] = entry.epoch;
  getTimerBus().runGeneration[conferenceId] = entry.runGeneration;
  emit(entry);
  emitTimerBus();
}

/**
 * Apply a full timers row from the server (upsert/select RETURNING).
 * Prefer this after Start/Pause so UI derives remaining from countdown_ends_at.
 */
export function applyServerTimerRow(
  conferenceId: string,
  row: ConferenceTimerRow,
  opts?: { restartCountdown?: boolean }
) {
  applyOptimisticTimerPatch(conferenceId, {
    ...row,
    conference_id: conferenceId,
    restartCountdown: opts?.restartCountdown,
  });
}

/** Countdown generation — changes when Start/resume must re-anchor the wall clock. */
export function useSharedConferenceTimerRunGeneration(conferenceId: string | null): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!conferenceId) return () => {};
      const bus = getTimerBus();
      bus.listeners.add(onStoreChange);
      const entry = acquireTimer(conferenceId);
      entry.listeners.add(onStoreChange);
      return () => {
        bus.listeners.delete(onStoreChange);
        entry.listeners.delete(onStoreChange);
        releaseTimer(conferenceId);
      };
    },
    () => {
      if (!conferenceId) return 0;
      return (
        getTimerBus().runGeneration[conferenceId] ??
        timerById().get(conferenceId)?.runGeneration ??
        0
      );
    },
    () => 0
  );
}

/** Re-read the timers row into the shared store after a local write (does not rely on realtime). */
export function refreshSharedConferenceTimer(
  conferenceId: string,
  opts?: { force?: boolean }
) {
  const entry = timerById().get(conferenceId);
  if (!entry) {
    // Still seed fetch into the bus even if no Map subscriber yet.
    acquireTimer(conferenceId);
    return;
  }
  const epochAtRequest = entry.epoch;
  const force = opts?.force === true;
  const supabase = getBrowserClient();
  void supabase
    .from("timers")
    .select("*")
    .eq("conference_id", conferenceId)
    .maybeSingle()
    .then(({ data, error }) => {
      const current = timerById().get(conferenceId);
      if (!current) return;
      // A newer optimistic Start/Pause won the race — keep it (unless forcing a revert).
      if (!force && current.epoch !== epochAtRequest) return;
      const next = (data as ConferenceTimerRow | null) ?? null;
      // Never replace a known timer with null on a failed/empty read (RLS miss, lag).
      if (next == null && current.value != null) {
        if (error || !force) return;
        return;
      }
      const busRow = readTimerBusRow(conferenceId);
      const baseline = busRow ?? current.value;
      if (!force && !shouldApplyTimerRow(baseline, next)) return;
      if (force) current.epoch += 1;
      current.value = next;
      current.loading = false;
      publishTimerEntry(conferenceId, current);
    });
}
