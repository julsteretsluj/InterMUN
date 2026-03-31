/** Wall-clock end wins over duration-from-start. */
export function committeeSessionEndTimestampMs(
  startedAtIso: string | null | undefined,
  durationSeconds: number | null | undefined,
  endsAtIso: string | null | undefined
): number | null {
  if (endsAtIso) {
    const t = new Date(endsAtIso).getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (!startedAtIso || durationSeconds == null || durationSeconds <= 0) return null;
  const t0 = new Date(startedAtIso).getTime();
  if (Number.isNaN(t0)) return null;
  return t0 + durationSeconds * 1000;
}

export function formatCountdownOrElapsed(endMs: number, nowMs: number): {
  label: "remaining" | "passed";
  text: string;
} {
  const deltaSec = Math.floor((endMs - nowMs) / 1000);
  if (deltaSec > 0) {
    const h = Math.floor(deltaSec / 3600);
    const m = Math.floor((deltaSec % 3600) / 60);
    const s = deltaSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const text = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    return { label: "remaining", text };
  }
  const overdue = Math.abs(deltaSec);
  const om = Math.floor(overdue / 60);
  const os = overdue % 60;
  return { label: "passed", text: om > 0 ? `${om}m ${os}s` : `${os}s` };
}
