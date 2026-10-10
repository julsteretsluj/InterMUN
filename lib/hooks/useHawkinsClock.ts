// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSharedProcedureState } from "@/lib/hooks/useCommitteeLiveStore";
import { FWC_ROP } from "@/lib/rop";
import { msUntilNextInGameMinute, readHawkinsClock, type HawkinsClockReading } from "@/lib/rop/hawkins-clock";
import { hawkinsClockStateFrom, normalizeSessionStateRow, type FwcSessionStateRow } from "@/lib/fwc/rop-state";

/**
 * Hawkins in-game clock computed locally from the shared session anchor.
 * Re-renders once per in-game minute; state changes arrive via realtime.
 */
export function useHawkinsClock(input: {
  canonicalConferenceId: string;
  initialRow: FwcSessionStateRow | null;
  initialSessionStartedAt: string | null;
  serverNowMs: number;
}): { reading: HawkinsClockReading; row: FwcSessionStateRow | null } {
  const clock = FWC_ROP.crisis!.clock;
  const [row, setRow] = useState<FwcSessionStateRow | null>(input.initialRow);
  const procedure = useSharedProcedureState(input.canonicalConferenceId);
  const sessionStartedAt =
    procedure === null ? input.initialSessionStartedAt : (procedure.committee_session_started_at ?? null);

  const offsetRef = useRef<number | null>(null);
  const [nowMs, setNowMs] = useState(input.serverNowMs);

  useEffect(() => {
    if (offsetRef.current == null) offsetRef.current = input.serverNowMs - Date.now();
  }, [input.serverNowMs]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`fwc-session-state-${input.canonicalConferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fwc_session_state",
          filter: `conference_id=eq.${input.canonicalConferenceId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setRow(normalizeSessionStateRow(payload.new as Record<string, unknown>));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [input.canonicalConferenceId]);

  const state = useMemo(() => hawkinsClockStateFrom(row, sessionStartedAt), [row, sessionStartedAt]);
  const reading = useMemo(() => readHawkinsClock(clock, state, nowMs), [clock, state, nowMs]);

  useEffect(() => {
    const syncedNow = () => Date.now() + (offsetRef.current ?? 0);
    setNowMs(syncedNow());
    if (!reading.running) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = syncedNow();
      setNowMs(now);
      const total = readHawkinsClock(clock, state, now).totalMinutes;
      timer = setTimeout(tick, msUntilNextInGameMinute(clock, total));
    };
    timer = setTimeout(tick, msUntilNextInGameMinute(clock, readHawkinsClock(clock, state, syncedNow()).totalMinutes));
    const onVisible = () => {
      if (document.visibilityState === "visible") setNowMs(syncedNow());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state, reading.running, clock]);

  return { reading, row };
}
