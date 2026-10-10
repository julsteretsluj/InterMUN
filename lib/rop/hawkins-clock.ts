// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { RopClockConfig } from "./types";

const DAY = 24 * 60;

/** Live clock inputs: `procedure_states` session start + the `fwc_session_state` clock columns. */
export type HawkinsClockState = {
  /** Live committee session start (null when no session is running). */
  sessionStartedAt: string | null;
  /** Session start the DB trigger last anchored (matches `sessionStartedAt` once synced). */
  clockSessionStartedAt: string | null;
  /** In-game minutes at that session start (start time, or carried over). */
  sessionBaseMinutes: number | null;
  /** Chair "set time": minutes at `overrideAt`, valid for the session it was set in. */
  overrideMinutes: number | null;
  overrideAt: string | null;
  paused: boolean;
  pausedMinutes: number | null;
  /** Value when the last session stopped (or a set-time while stopped). */
  frozenMinutes: number | null;
  /** Chair's crisis day counter (1-based); offsets the day when sessions restart at midday. */
  crisisDay: number;
};

export type HawkinsClockReading = {
  /** Minutes since midnight of in-game Day 1 (before the crisis-day offset). */
  totalMinutes: number;
  day: number;
  hours: number;
  minutes: number;
  /** "14:30" */
  hhmm: string;
  running: boolean;
  /** Chair pause or no session running. */
  paused: boolean;
  pauseReason: "chair" | "no_session" | null;
  blockLabel: string;
};

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function inGameMinutesAfter(clock: RopClockConfig, baseMinutes: number, anchorMs: number, nowMs: number): number {
  const elapsedRealMinutes = Math.max(0, nowMs - anchorMs) / 60000;
  return baseMinutes + elapsedRealMinutes * clock.rate;
}

/** Session-start value: carried from the last frozen value or reset to the configured start. */
export function sessionStartMinutes(clock: RopClockConfig, frozenMinutes: number | null): number {
  if (clock.carryOverBetweenSessions && frozenMinutes != null) return frozenMinutes;
  return clock.startMinutes;
}

export function computeHawkinsMinutes(
  clock: RopClockConfig,
  state: HawkinsClockState,
  nowMs: number
): { total: number; running: boolean; pauseReason: "chair" | "no_session" | null } {
  if (state.paused) {
    return { total: state.pausedMinutes ?? state.frozenMinutes ?? clock.startMinutes, running: false, pauseReason: "chair" };
  }
  const startedMs = ms(state.sessionStartedAt);
  if (startedMs == null) {
    return { total: state.frozenMinutes ?? clock.startMinutes, running: false, pauseReason: "no_session" };
  }
  const overrideMs = ms(state.overrideAt);
  if (overrideMs != null && state.overrideMinutes != null && overrideMs >= startedMs) {
    return { total: inGameMinutesAfter(clock, state.overrideMinutes, overrideMs, nowMs), running: true, pauseReason: null };
  }
  const anchoredByTrigger =
    state.sessionBaseMinutes != null && ms(state.clockSessionStartedAt) === startedMs;
  const base = anchoredByTrigger ? state.sessionBaseMinutes! : sessionStartMinutes(clock, state.frozenMinutes);
  return { total: inGameMinutesAfter(clock, base, startedMs, nowMs), running: true, pauseReason: null };
}

export function blockLabelFor(clock: RopClockConfig, minuteOfDay: number): string {
  let label = clock.blocks[0]?.label ?? "";
  for (const block of clock.blocks) {
    if (minuteOfDay >= block.fromMinutes) label = block.label;
  }
  return label;
}

export function readHawkinsClock(clock: RopClockConfig, state: HawkinsClockState, nowMs: number): HawkinsClockReading {
  const { total, running, pauseReason } = computeHawkinsMinutes(clock, state, nowMs);
  const whole = Math.max(0, Math.floor(total + 1e-9));
  const dayIndex = Math.floor(whole / DAY);
  const minuteOfDay = whole - dayIndex * DAY;
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const dayOffset = clock.carryOverBetweenSessions ? 0 : Math.max(0, (state.crisisDay || 1) - 1);
  return {
    totalMinutes: total,
    day: dayIndex + 1 + dayOffset,
    hours,
    minutes,
    hhmm: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    running,
    paused: !running,
    pauseReason,
    blockLabel: blockLabelFor(clock, minuteOfDay),
  };
}

/** "Day 2 · 01:30" (day shown only after the first in-game midnight or past day 1). */
export function formatHawkinsClock(reading: HawkinsClockReading): string {
  return reading.day > 1 ? `Day ${reading.day} · ${reading.hhmm}` : reading.hhmm;
}

/** Parse "HH:MM" (optionally with a day) into total minutes on the current in-game day. */
export function parseHawkinsTime(input: string, day = 1): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(input);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return (Math.max(1, day) - 1) * DAY + h * 60 + min;
}

/** Real milliseconds until the next in-game minute ticks over (for low-frequency re-render). */
export function msUntilNextInGameMinute(clock: RopClockConfig, totalMinutes: number): number {
  const frac = totalMinutes - Math.floor(totalMinutes);
  const realMsPerGameMinute = 60000 / clock.rate;
  return Math.max(250, Math.ceil((1 - frac) * realMsPerGameMinute));
}
