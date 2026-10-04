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
  updated_at?: string | null;
};

/** Prefer the newer timers row when an in-flight fetch races an optimistic Start/Pause. */
function shouldApplyTimerRow(
  current: ConferenceTimerRow | null,
  next: ConferenceTimerRow | null
): boolean {
  if (!next) return true;
  if (!current?.updated_at || !next.updated_at) return true;
  const curMs = Date.parse(current.updated_at);
  const nextMs = Date.parse(next.updated_at);
  if (Number.isNaN(curMs) || Number.isNaN(nextMs)) return true;
  if (nextMs > curMs) return true;
  if (nextMs < curMs) return false;
  // Equal timestamps: never let a paused snapshot clobber an optimistic Start.
  if (current.is_running === true && next.is_running === false) return false;
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

const procedureById = new Map<string, StoreEntry<ProcedureLiveRow>>();
const timerById = new Map<string, TimerStoreEntry>();

function getBrowserClient(): SupabaseClient {
  return createBrowserClient() as unknown as SupabaseClient;
}

function emit<T>(entry: StoreEntry<T>) {
  entry.listeners.forEach((listener) => listener());
}

function acquireProcedure(conferenceId: string): StoreEntry<ProcedureLiveRow> {
  let entry = procedureById.get(conferenceId);
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
  procedureById.set(conferenceId, entry);

  const supabase = getBrowserClient();
  void supabase
    .from("procedure_states")
    .select(
      "state, current_vote_item_id, committee_session_started_at, committee_session_duration_seconds, committee_session_ends_at"
    )
    .eq("conference_id", conferenceId)
    .maybeSingle()
    .then(({ data, error }) => {
      const current = procedureById.get(conferenceId);
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
        const current = procedureById.get(conferenceId);
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
  const entry = procedureById.get(conferenceId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  if (entry.channel) {
    void getBrowserClient().removeChannel(entry.channel);
  }
  procedureById.delete(conferenceId);
}

function acquireTimer(conferenceId: string): TimerStoreEntry {
  let entry = timerById.get(conferenceId);
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
    epoch: 0,
    runGeneration: 0,
  };
  timerById.set(conferenceId, entry);

  const supabase = getBrowserClient();
  void supabase
    .from("timers")
    .select("*")
    .eq("conference_id", conferenceId)
    .maybeSingle()
    .then(({ data }) => {
      const current = timerById.get(conferenceId);
      if (!current) return;
      // Optimistic patches / realtime may finish before this fetch; never clobber them.
      if (!current.loading) return;
      current.value = (data as ConferenceTimerRow | null) ?? null;
      current.loading = false;
      emit(current);
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
        const current = timerById.get(conferenceId);
        if (!current) return;
        if (payload.eventType === "DELETE") {
          current.value = null;
        } else {
          const next = (payload.new as ConferenceTimerRow | null) ?? null;
          if (!shouldApplyTimerRow(current.value, next)) return;
          current.value = next;
        }
        current.loading = false;
        emit(current);
      }
    )
    .subscribe();

  return entry;
}

function releaseTimer(conferenceId: string) {
  const entry = timerById.get(conferenceId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  if (entry.channel) {
    void getBrowserClient().removeChannel(entry.channel);
  }
  timerById.delete(conferenceId);
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
    () => (conferenceId ? procedureById.get(conferenceId)?.value ?? null : null),
    () => null
  );
}

/** Shared timers row — one realtime channel per conference id. */
export function useSharedConferenceTimerRow(conferenceId: string | null): ConferenceTimerRow | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!conferenceId) return () => {};
      const entry = acquireTimer(conferenceId);
      entry.listeners.add(onStoreChange);
      return () => {
        entry.listeners.delete(onStoreChange);
        releaseTimer(conferenceId);
      };
    },
    () => (conferenceId ? timerById.get(conferenceId)?.value ?? null : null),
    () => null
  );
}

/** Refresh procedure snapshot after local chair actions (same channel stays open). */
export function refreshSharedProcedureState(conferenceId: string) {
  const entry = procedureById.get(conferenceId);
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
      const current = procedureById.get(conferenceId);
      if (!current) return;
      current.value = (data as ProcedureLiveRow | null) ?? null;
      emit(current);
    });
}

/**
 * Instant local timer update for chair start/pause/advance before the network round-trip.
 * No-op if nobody is subscribed yet (first paint will load from Supabase).
 *
 * Pass `restartCountdown: true` from Start/resume so the wall-clock anchor resets even
 * when `time_left_seconds` and `is_running` are unchanged (UI had already counted to 0).
 */
export function applyOptimisticTimerPatch(
  conferenceId: string,
  patch: Partial<ConferenceTimerRow> & { restartCountdown?: boolean }
) {
  const entry = timerById.get(conferenceId);
  if (!entry) return;
  const { restartCountdown, ...rowPatch } = patch;
  const base: ConferenceTimerRow = entry.value ?? {
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
  if (restartCountdown || starting || rewritingLeft) {
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
  emit(entry);
}

/** Countdown generation — changes when Start/resume must re-anchor the wall clock. */
export function useSharedConferenceTimerRunGeneration(conferenceId: string | null): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!conferenceId) return () => {};
      const entry = acquireTimer(conferenceId);
      entry.listeners.add(onStoreChange);
      return () => {
        entry.listeners.delete(onStoreChange);
        releaseTimer(conferenceId);
      };
    },
    () => (conferenceId ? timerById.get(conferenceId)?.runGeneration ?? 0 : 0),
    () => 0
  );
}

/** Re-read the timers row into the shared store after a local write (does not rely on realtime). */
export function refreshSharedConferenceTimer(
  conferenceId: string,
  opts?: { force?: boolean }
) {
  const entry = timerById.get(conferenceId);
  if (!entry) return;
  const epochAtRequest = entry.epoch;
  const force = opts?.force === true;
  const supabase = getBrowserClient();
  void supabase
    .from("timers")
    .select("*")
    .eq("conference_id", conferenceId)
    .maybeSingle()
    .then(({ data }) => {
      const current = timerById.get(conferenceId);
      if (!current) return;
      // A newer optimistic Start/Pause won the race — keep it (unless forcing a revert).
      if (!force && current.epoch !== epochAtRequest) return;
      const next = (data as ConferenceTimerRow | null) ?? null;
      if (!force && !shouldApplyTimerRow(current.value, next)) return;
      if (force) current.epoch += 1;
      current.value = next;
      current.loading = false;
      emit(current);
    });
}
