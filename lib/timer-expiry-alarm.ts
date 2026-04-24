/**
 * Short alarm when a live floor speech timer reaches zero (Web Audio API).
 * Dedupes rapid repeat calls so multiple UI subscribers only trigger one sound.
 */

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

/** Three-tone chime; safe to call from effects (uses dedupe). */
export function playTimerExpiryAlarm(): void {
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
