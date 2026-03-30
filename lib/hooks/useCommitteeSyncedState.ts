"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommitteeSyncedStateKey } from "@/lib/committee-synced-state-keys";

type UseCommitteeSyncedStateArgs<T> = {
  conferenceId: string;
  stateKey: CommitteeSyncedStateKey;
  defaultValue: T;
  parsePayload: (raw: unknown) => T;
  toPayload: (value: T) => unknown;
  /** True if stored state is non-empty / worth keeping over default */
  hasMeaningfulData: (value: T) => boolean;
  /** Read legacy localStorage once; return null if missing (kept in a ref to avoid effect churn) */
  loadLegacy: () => T | null;
  debounceMs?: number;
};

/**
 * Load/update a JSON payload in `committee_synced_state`, with one-time localStorage migration
 * and Supabase Realtime updates when replication is enabled for that table.
 */
export function useCommitteeSyncedState<T>({
  conferenceId,
  stateKey,
  defaultValue,
  parsePayload,
  toPayload,
  hasMeaningfulData,
  loadLegacy,
  debounceMs = 450,
}: UseCommitteeSyncedStateArgs<T>) {
  const [value, setValueState] = useState<T>(defaultValue);
  const [ready, setReady] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const debounceTimer = useRef<number | null>(null);
  const supabaseRef = useRef(createClient());

  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;
  const parsePayloadRef = useRef(parsePayload);
  parsePayloadRef.current = parsePayload;
  const toPayloadRef = useRef(toPayload);
  toPayloadRef.current = toPayload;
  const hasMeaningfulDataRef = useRef(hasMeaningfulData);
  hasMeaningfulDataRef.current = hasMeaningfulData;
  const loadLegacyRef = useRef(loadLegacy);
  loadLegacyRef.current = loadLegacy;

  const flushUpsert = useCallback(
    async (next: T) => {
      const supabase = supabaseRef.current;
      const { error } = await supabase.from("committee_synced_state").upsert(
        {
          conference_id: conferenceId,
          state_key: stateKey,
          payload: toPayloadRef.current(next),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conference_id,state_key" }
      );
      if (error) {
        console.error("committee_synced_state upsert", error);
      }
    },
    [conferenceId, stateKey]
  );

  const schedulePersist = useCallback(
    (next: T) => {
      setValueState(next);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        debounceTimer.current = null;
        void flushUpsert(next);
      }, debounceMs);
    },
    [debounceMs, flushUpsert]
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseRef.current;

    setReady(false);
    setValueState(defaultValueRef.current);

    void (async () => {
      const { data: row, error } = await supabase
        .from("committee_synced_state")
        .select("payload")
        .eq("conference_id", conferenceId)
        .eq("state_key", stateKey)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("committee_synced_state select", error);
      }

      let next: T = defaultValueRef.current;
      if (row?.payload != null) {
        next = parsePayloadRef.current(row.payload);
      }

      if (!hasMeaningfulDataRef.current(next)) {
        const legacy = loadLegacyRef.current();
        if (legacy != null && hasMeaningfulDataRef.current(legacy)) {
          next = legacy;
          await flushUpsert(legacy);
        }
      }

      if (!cancelled) {
        setValueState(next);
        setReady(true);
      }
    })();

    const channel = supabase
      .channel(`committee-synced-${conferenceId}-${stateKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "committee_synced_state",
          filter: `conference_id=eq.${conferenceId}`,
        },
        (payload) => {
          const n = payload.new as { state_key?: string; payload?: unknown } | null | undefined;
          if (!n || n.state_key !== stateKey) return;
          if (n.payload == null) {
            if (!cancelled) setValueState(defaultValueRef.current);
            return;
          }
          const parsed = parsePayloadRef.current(n.payload);
          if (!cancelled) setValueState(parsed);
        }
      )
      .subscribe();

    const onFocus = () => {
      void (async () => {
        const { data: row } = await supabase
          .from("committee_synced_state")
          .select("payload")
          .eq("conference_id", conferenceId)
          .eq("state_key", stateKey)
          .maybeSingle();
        if (cancelled || row?.payload == null) return;
        setValueState(parsePayloadRef.current(row.payload));
      })();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [conferenceId, stateKey, flushUpsert]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        void flushUpsert(valueRef.current);
      }
    };
  }, [flushUpsert]);

  return { value, setValue: schedulePersist, ready };
}
