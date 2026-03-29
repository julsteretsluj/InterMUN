"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Stored = {
  conferenceStart: string | null;
  paperDeadline: string | null;
};

function loadStored(conferenceId: string): Stored {
  try {
    const raw = localStorage.getItem(`intermun-delegate-countdown-${conferenceId}`);
    if (!raw) return { conferenceStart: null, paperDeadline: null };
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      conferenceStart: typeof p.conferenceStart === "string" ? p.conferenceStart : null,
      paperDeadline: typeof p.paperDeadline === "string" ? p.paperDeadline : null,
    };
  } catch {
    return { conferenceStart: null, paperDeadline: null };
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Started";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CountdownLine({ label, iso }: { label: string; iso: string | null }) {
  const target = useMemo(() => (iso ? new Date(iso).getTime() : NaN), [iso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!iso || Number.isNaN(target)) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [iso, target]);

  if (!iso || Number.isNaN(target)) {
    return (
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        <span className="font-medium text-slate-700 dark:text-zinc-300">{label}:</span> not set
      </p>
    );
  }

  const remaining = target - now;
  const past = remaining <= 0;

  return (
    <p className="text-sm text-slate-700 dark:text-zinc-200">
      <span className="font-medium">{label}:</span>{" "}
      <span className={past ? "text-emerald-600 dark:text-emerald-400" : "tabular-nums"}>
        {past ? "Past" : formatRemaining(remaining)}
      </span>
      <span className="ml-1 text-slate-500 dark:text-zinc-500">
        ({new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })})
      </span>
    </p>
  );
}

export function DelegateCountdownCard({ conferenceId }: { conferenceId: string }) {
  const [conferenceStart, setConferenceStart] = useState<string | null>(null);
  const [paperDeadline, setPaperDeadline] = useState<string | null>(null);

  const persist = useCallback(
    (next: Stored) => {
      try {
        localStorage.setItem(`intermun-delegate-countdown-${conferenceId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [conferenceId]
  );

  useEffect(() => {
    const s = loadStored(conferenceId);
    setConferenceStart(s.conferenceStart);
    setPaperDeadline(s.paperDeadline);
  }, [conferenceId]);

  const onChangeStart = (v: string) => {
    setConferenceStart(v || null);
    persist({ conferenceStart: v || null, paperDeadline });
  };
  const onChangePaper = (v: string) => {
    setPaperDeadline(v || null);
    persist({ conferenceStart, paperDeadline: v || null });
  };

  return (
    <section
      id="countdown"
      className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
    >
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-zinc-50">
        ⏱️ Conference &amp; position paper countdown
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Saved on this device for this committee (like the SEAMUNs delegate dashboard). Use your local timezone.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700 dark:text-zinc-300">Conference start</span>
          <input
            type="datetime-local"
            value={conferenceStart ?? ""}
            onChange={(e) => onChangeStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700 dark:text-zinc-300">Position paper deadline</span>
          <input
            type="datetime-local"
            value={paperDeadline ?? ""}
            onChange={(e) => onChangePaper(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
      </div>
      <div className="mt-4 space-y-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-zinc-800/60">
        <CountdownLine label="Until conference" iso={conferenceStart} />
        <CountdownLine label="Until paper deadline" iso={paperDeadline} />
      </div>
    </section>
  );
}
