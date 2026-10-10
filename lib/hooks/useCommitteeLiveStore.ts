// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { requestGuardedFetch } from "@/lib/live-fetch-guard";

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
  updated_at?: string | null;
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
type InFlightFetches = {
  releaseTimers: Map<string, ReturnType<typeof setTimeout>>;
};

function getInFlightFetches(): InFlightFetches {
  const g = globalThis as typeof globalThis & {
    __intermunCommitteeLiveInFlight?: InFlightFetches;
  };
  if (!g.__intermunCommitteeLiveInFlight) {
    g.__intermunCommitteeLiveInFlight = {
      releaseTimers: new Map(),
    };
  }
  return g.__intermunCommitteeLiveInFlight;
}

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

const PROCEDURE_SELECT =
  "state, current_vote_item_id, committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at, updated_at";

/**
 * Procedure rows share the same chunk-split problem as the timer bus: Start can
 * write one module copy while the deferred status bar reads another. A window
 * record is the snapshot both sides paint from.
 */
type ProcedureWindowBus = {
  version: number;
  rows: Record<string, ProcedureLiveRow | null>;
  epochs: Record<string, number>;
  listeners: Set<() => void>;
};

const PROCEDURE_BUS_KEY = "__intermunProcedureBus_v1";

function getProcedureBus(): ProcedureWindowBus {
  const root =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : (globalThis as unknown as Record<string, unknown>);
  let bus = root[PROCEDURE_BUS_KEY] as ProcedureWindowBus | undefined;
  if (!bus) {
    bus = { version: 0, rows: {}, epochs: {}, listeners: new Set() };
    root[PROCEDURE_BUS_KEY] = bus;
  }
  return bus;
}

function emitProcedureBus() {
  const bus = getProcedureBus();
  bus.version += 1;
  bus.listeners.forEach((listener) => listener());
}

function procedureBusHas(conferenceId: string): boolean {
  return Object.prototype.hasOwnProperty.call(getProcedureBus().rows, conferenceId);
}

function readProcedureBusRow(conferenceId: string): ProcedureLiveRow | null {
  const bus = getProcedureBus();
  return procedureBusHas(conferenceId) ? bus.rows[conferenceId] ?? null : null;
}

function shouldApplyProcedureRow(
  current: ProcedureLiveRow | null,
  next: ProcedureLiveRow | null
): boolean {
  if (!next) return current == null;
  if (!current) return true;
  const curMs = current.updated_at ? Date.parse(current.updated_at) : NaN;
  const nextMs = next.updated_at ? Date.parse(next.updated_at) : NaN;
  if (!Number.isNaN(curMs) && !Number.isNaN(nextMs)) return nextMs >= curMs;
  // A failed or pre-start read must not clear a session that just went live.
  if (current.committee_session_started_at && !next.committee_session_started_at) return false;
  return true;
}

function publishProcedureRow(
  conferenceId: string,
  row: ProcedureLiveRow | null,
  opts?: { bumpEpoch?: boolean }
) {
  const bus = getProcedureBus();
  bus.rows[conferenceId] = row;
  if (opts?.bumpEpoch) {
    bus.epochs[conferenceId] = (bus.epochs[conferenceId] ?? 0) + 1;
  }
  const entry = procedureById().get(conferenceId);
  if (entry) {
    entry.value = row;
    entry.loading = false;
    emit(entry);
  }
  emitProcedureBus();
}

async function runProcedureFetch(conferenceId: string): Promise<boolean> {
  const supabase = getBrowserClient();
  const epochAtRequest = getProcedureBus().epochs[conferenceId] ?? 0;
  try {
    const { data, error } = await supabase
      .from("procedure_states")
      .select(PROCEDURE_SELECT)
      .eq("conference_id", conferenceId)
      .maybeSingle();
    const current = procedureById().get(conferenceId);
    const errorMessage = String(error?.message ?? "");
    const missingSessionColumns =
      /schema cache/i.test(errorMessage) &&
      /committee_session_started_at|committee_session_duration_seconds|committee_session_ends_at/i.test(
        errorMessage
      );
    if (!current) return !error || missingSessionColumns;
    if (error && !missingSessionColumns) {
      current.loading = false;
      emit(current);
      emitProcedureBus();
      return false;
    }
    const next = missingSessionColumns
      ? ((data as ProcedureLiveRow | null) ?? {
          state: null,
          current_vote_item_id: null,
        })
      : ((data as ProcedureLiveRow | null) ?? null);
    const epochMoved = (getProcedureBus().epochs[conferenceId] ?? 0) !== epochAtRequest;
    const baseline = readProcedureBusRow(conferenceId) ?? current.value;
    if (epochMoved && !shouldApplyProcedureRow(baseline, next)) {
      current.value = baseline;
      current.loading = false;
      emit(current);
      return true;
    }
    if (!shouldApplyProcedureRow(baseline, next)) {
      current.loading = false;
      emit(current);
      return true;
    }
    publishProcedureRow(conferenceId, next);
    return true;
  } catch {
    const current = procedureById().get(conferenceId);
    if (current?.loading) {
      current.loading = false;
      emit(current);
    }
    return false;
  }
}

/** All procedure_states REST reads go through the per-conference guard. */
function fetchProcedureSnapshot(conferenceId: string, opts?: { trailing?: boolean }): Promise<void> {
  return requestGuardedFetch(`procedure:${conferenceId}`, () => runProcedureFetch(conferenceId), {
    trailing: opts?.trailing,
    when: () => procedureById().has(conferenceId),
  });
}

function acquireProcedure(conferenceId: string): StoreEntry<ProcedureLiveRow> {
  const map = procedureById();
  const pendingRelease = getInFlightFetches().releaseTimers.get(`procedure:${conferenceId}`);
  if (pendingRelease) {
    clearTimeout(pendingRelease);
    getInFlightFetches().releaseTimers.delete(`procedure:${conferenceId}`);
  }

  let entry = map.get(conferenceId);
  if (entry) {
    entry.refCount += 1;
    return entry;
  }

  const seeded = procedureBusHas(conferenceId);
  entry = {
    refCount: 1,
    value: seeded ? readProcedureBusRow(conferenceId) : null,
    listeners: new Set(),
    channel: null,
    loading: !seeded,
  };
  map.set(conferenceId, entry);

  // Bus already painted — skip the REST hit; realtime keeps us fresh.
  if (!seeded) {
    void fetchProcedureSnapshot(conferenceId);
  }

  const supabase = getBrowserClient();
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
        if (payload.eventType === "DELETE") {
          publishProcedureRow(conferenceId, null);
          return;
        }
        const next = (payload.new as ProcedureLiveRow | null) ?? null;
        const baseline = readProcedureBusRow(conferenceId) ?? current.value;
        if (!shouldApplyProcedureRow(baseline, next)) return;
        publishProcedureRow(conferenceId, next);
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
  // Grace period absorbs React Strict Mode remount / brief unmount storms.
  const key = `procedure:${conferenceId}`;
  const previous = getInFlightFetches().releaseTimers.get(key);
  if (previous) clearTimeout(previous);
  const handle = setTimeout(() => {
    getInFlightFetches().releaseTimers.delete(key);
    const current = procedureById().get(conferenceId);
    if (!current || current.refCount > 0) return;
    if (current.channel) {
      void getBrowserClient().removeChannel(current.channel);
    }
    procedureById().delete(conferenceId);
  }, 1500);
  getInFlightFetches().releaseTimers.set(key, handle);
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

/** Conferences whose next timer read must overwrite local state (explicit revert). */
const forcedTimerReads = new Set<string>();

async function runTimerFetch(conferenceId: string): Promise<boolean> {
  const force = forcedTimerReads.delete(conferenceId);
  const epochAtRequest = timerById().get(conferenceId)?.epoch ?? 0;
  try {
    const { data, error } = await getBrowserClient()
      .from("timers")
      .select("*")
      .eq("conference_id", conferenceId)
      .maybeSingle();
    const current = timerById().get(conferenceId);
    if (!current) return !error;
    if (error) {
      if (current.loading) {
        current.loading = false;
        publishTimerEntry(conferenceId, current);
      }
      return false;
    }
    const next = (data as ConferenceTimerRow | null) ?? null;
    // A newer optimistic Start/Pause won the race — keep it (unless forcing a revert).
    if (!force && current.epoch !== epochAtRequest) return true;
    // Never replace a known timer with null on an empty read (RLS miss, replica lag).
    if (next == null && (current.value != null || readTimerBusRow(conferenceId) != null)) {
      if (current.loading) {
        current.loading = false;
        publishTimerEntry(conferenceId, current);
      }
      return true;
    }
    const baseline = readTimerBusRow(conferenceId) ?? current.value;
    if (!force && baseline && !shouldApplyTimerRow(baseline, next)) {
      current.value = baseline;
      current.loading = false;
      publishTimerEntry(conferenceId, current);
      return true;
    }
    if (force) current.epoch += 1;
    current.value = next;
    current.loading = false;
    publishTimerEntry(conferenceId, current);
    return true;
  } catch {
    const current = timerById().get(conferenceId);
    if (current?.loading) {
      current.loading = false;
      publishTimerEntry(conferenceId, current);
    }
    return false;
  }
}

/** All timers REST reads go through the per-conference guard. */
function fetchTimerSnapshot(
  conferenceId: string,
  opts?: { trailing?: boolean; force?: boolean }
): Promise<void> {
  if (opts?.force) forcedTimerReads.add(conferenceId);
  return requestGuardedFetch(`timer:${conferenceId}`, () => runTimerFetch(conferenceId), {
    trailing: opts?.trailing,
    when: () => timerById().has(conferenceId),
  });
}

function acquireTimer(conferenceId: string): TimerStoreEntry {
  const map = timerById();
  const pendingRelease = getInFlightFetches().releaseTimers.get(`timer:${conferenceId}`);
  if (pendingRelease) {
    clearTimeout(pendingRelease);
    getInFlightFetches().releaseTimers.delete(`timer:${conferenceId}`);
  }

  let entry = map.get(conferenceId);
  if (entry) {
    entry.refCount += 1;
    return entry;
  }

  const busRow = readTimerBusRow(conferenceId);
  entry = {
    refCount: 1,
    value: busRow,
    listeners: new Set(),
    channel: null,
    loading: busRow == null,
    epoch: getTimerBus().epochs[conferenceId] ?? 0,
    runGeneration: getTimerBus().runGeneration[conferenceId] ?? 0,
  };
  map.set(conferenceId, entry);

  if (busRow == null) {
    void fetchTimerSnapshot(conferenceId);
  }

  const supabase = getBrowserClient();
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
          const existingBus = readTimerBusRow(conferenceId);
          const baseline = existingBus ?? current.value;
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
  const key = `timer:${conferenceId}`;
  const previous = getInFlightFetches().releaseTimers.get(key);
  if (previous) clearTimeout(previous);
  const handle = setTimeout(() => {
    getInFlightFetches().releaseTimers.delete(key);
    const current = timerById().get(conferenceId);
    if (!current || current.refCount > 0) return;
    if (current.channel) {
      void getBrowserClient().removeChannel(current.channel);
    }
    timerById().delete(conferenceId);
  }, 1500);
  getInFlightFetches().releaseTimers.set(key, handle);
}

function subscribeProcedure(conferenceId: string | null, onStoreChange: () => void) {
  if (!conferenceId) return () => {};
  const bus = getProcedureBus();
  bus.listeners.add(onStoreChange);
  const entry = acquireProcedure(conferenceId);
  entry.listeners.add(onStoreChange);
  return () => {
    bus.listeners.delete(onStoreChange);
    entry.listeners.delete(onStoreChange);
    releaseProcedure(conferenceId);
  };
}

function subscribeTimer(conferenceId: string | null, onStoreChange: () => void) {
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
}

/**
 * Shared procedure_states row — window bus first, Map/realtime as feeder.
 * `subscribe` must keep its identity across renders: React re-subscribes whenever it
 * changes, and an inline arrow turned every render into release + acquire (+ REST read).
 */
export function useSharedProcedureState(conferenceId: string | null): ProcedureLiveRow | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeProcedure(conferenceId, onStoreChange),
    [conferenceId]
  );
  const getSnapshot = useCallback(() => {
    if (!conferenceId) return null;
    if (procedureBusHas(conferenceId)) return readProcedureBusRow(conferenceId);
    return procedureById().get(conferenceId)?.value ?? null;
  }, [conferenceId]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerNull);
}

function getServerNull() {
  return null;
}

/** Shared timers row — window bus first, Map/realtime as feeder. */
export function useSharedConferenceTimerRow(conferenceId: string | null): ConferenceTimerRow | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeTimer(conferenceId, onStoreChange),
    [conferenceId]
  );
  const getSnapshot = useCallback(() => {
    if (!conferenceId) return null;
    // Bus is authoritative for Start/Pause paint across duplicated module graphs.
    if (Object.prototype.hasOwnProperty.call(getTimerBus().rows, conferenceId)) {
      return readTimerBusRow(conferenceId);
    }
    return timerById().get(conferenceId)?.value ?? null;
  }, [conferenceId]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerNull);
}

/** Refresh procedure snapshot after local chair actions (same channel stays open). */
export function refreshSharedProcedureState(conferenceId: string) {
  if (!procedureById().has(conferenceId)) return;
  void fetchProcedureSnapshot(conferenceId, { trailing: true });
}

/** Paint a committee-session start/stop on the status bar before the refetch lands. */
export function applyOptimisticProcedurePatch(
  conferenceId: string,
  patch: Partial<ProcedureLiveRow>
) {
  const base = readProcedureBusRow(conferenceId) ?? procedureById().get(conferenceId)?.value ?? {};
  publishProcedureRow(
    conferenceId,
    {
      ...base,
      ...patch,
      updated_at: patch.updated_at ?? new Date().toISOString(),
    },
    { bumpEpoch: true }
  );
}

/**
 * Copy a server-rendered session onto the status-bar bus.
 * A newer local start/stop (higher `updated_at`) is left in place.
 */
export function seedSharedProcedureSession(conferenceId: string, row: ProcedureLiveRow) {
  if (!conferenceId || !row.committee_session_started_at) return;
  const current = readProcedureBusRow(conferenceId);
  const next: ProcedureLiveRow = {
    ...current,
    ...row,
    committee_session_started_at: row.committee_session_started_at,
    updated_at: row.updated_at ?? row.committee_session_started_at,
  };
  if (current && !shouldApplyProcedureRow(current, next)) return;
  publishProcedureRow(conferenceId, next);
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

/**
 * Hydrate the shared store + window timer bus from a chair refresh fetch without
 * clobbering a newer optimistic Start/Pause. Also clears a stuck `loading` flag.
 */
export function hydrateSharedConferenceTimer(
  conferenceId: string,
  row: ConferenceTimerRow
) {
  const entry = timerById().get(conferenceId);
  if (!entry) {
    applyServerTimerRow(conferenceId, row);
    return;
  }
  const baseline = readTimerBusRow(conferenceId) ?? entry.value;
  if (!shouldApplyTimerRow(baseline, row)) {
    if (entry.loading) {
      entry.loading = false;
      emit(entry);
    }
    return;
  }
  entry.value = { ...row, conference_id: conferenceId };
  entry.loading = false;
  publishTimerEntry(conferenceId, entry);
}

/** Countdown generation — changes when Start/resume must re-anchor the wall clock. */
export function useSharedConferenceTimerRunGeneration(conferenceId: string | null): number {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeTimer(conferenceId, onStoreChange),
    [conferenceId]
  );
  const getSnapshot = useCallback(() => {
    if (!conferenceId) return 0;
    return (
      getTimerBus().runGeneration[conferenceId] ??
      timerById().get(conferenceId)?.runGeneration ??
      0
    );
  }, [conferenceId]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerZero);
}

function getServerZero() {
  return 0;
}

/** Re-read the timers row into the shared store after a local write (does not rely on realtime). */
export function refreshSharedConferenceTimer(
  conferenceId: string,
  opts?: { force?: boolean }
) {
  if (!timerById().has(conferenceId)) {
    // Keep a store entry (and its realtime channel) alive for the reconcile read.
    acquireTimer(conferenceId);
  }
  void fetchTimerSnapshot(conferenceId, { trailing: true, force: opts?.force === true });
}
