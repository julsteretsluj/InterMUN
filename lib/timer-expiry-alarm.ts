/**
 * Short alarm when an in-app countdown reaches zero (Web Audio API).
 * Opt-in via `readTimerExpiryAlarmEnabled()` (stored in localStorage); off by default.
 * Dedupes rapid repeat calls so multiple UI subscribers only trigger one sound.
 */

export const TIMER_EXPIRY_ALARM_STORAGE_KEY = "intermun-timer-expiry-alarm-enabled";

export function readTimerExpiryAlarmEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(TIMER_EXPIRY_ALARM_STORAGE_KEY);
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

export function setTimerExpiryAlarmEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) localStorage.setItem(TIMER_EXPIRY_ALARM_STORAGE_KEY, "1");
    else localStorage.removeItem(TIMER_EXPIRY_ALARM_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
}

let sharedAudioContext: AudioContext | null = null;
let lastAlarmAtMs = 0;

const DEDUPE_MS = 900;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new Ctx();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

function scheduleBeep(
  ctx: AudioContext,
  startTime: number,
  frequencyHz: number,
  durationSec: number,
  peakGain: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequencyHz, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + durationSec + 0.02);
}

/** Three-tone chime; safe to call from effects (uses dedupe). No-op unless the user enabled the preference. */
export function playTimerExpiryAlarm(): void {
  if (!readTimerExpiryAlarmEnabled()) return;
  const now = Date.now();
  if (now - lastAlarmAtMs < DEDUPE_MS) return;
  lastAlarmAtMs = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  void ctx.resume().then(() => {
    const t0 = ctx.currentTime;
    scheduleBeep(ctx, t0, 880, 0.18, 0.14);
    scheduleBeep(ctx, t0 + 0.22, 660, 0.22, 0.12);
    scheduleBeep(ctx, t0 + 0.5, 880, 0.32, 0.13);
  });
}
