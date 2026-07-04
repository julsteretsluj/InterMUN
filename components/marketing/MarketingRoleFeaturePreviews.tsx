"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  SkipForward,
  Star,
  Trash2,
} from "lucide-react";
import type { RollAttendance } from "@/lib/roll-attendance";
import { ROLL_ATTENDANCE_BUTTONS } from "@/lib/roll-call-attendance-buttons";
import {
  MARKETING_CHAMBER_PREVIEW,
  MARKETING_DARK_GLASS_CARD,
  marketingRollAttendanceButtonClass,
  PREVIEW_CARD,
  PREVIEW_HEADING,
  PREVIEW_LABEL,
  PREVIEW_MUTED,
  PREVIEW_ROW,
} from "@/components/marketing/marketing-preview-styles";
import { cn } from "@/lib/utils";

type RollRow = { id: string; country: string; status: RollAttendance };

const ROLL_SEED: RollRow[] = [
  { id: "kenya", country: "Kenya", status: "present_voting" },
  { id: "mexico", country: "Mexico", status: "present_voting" },
  { id: "norway", country: "Norway", status: "present_abstain" },
  { id: "philippines", country: "Philippines", status: "absent" },
  { id: "canada", country: "Canada", status: "present_voting" },
];

function formatTimer(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function quorumFromRows(rows: RollRow[]) {
  const present = rows.filter((r) => r.status !== "absent").length;
  const voting = rows.filter((r) => r.status === "present_voting").length;
  return { present, voting, total: rows.length };
}

export function ChairRollCallQuorumDemo() {
  const t = useTranslations("marketing.rolePreviews.chair");
  const tc = useTranslations("sessionControlClient");
  const [rows, setRows] = useState(ROLL_SEED);
  const { present, voting, total } = useMemo(() => quorumFromRows(rows), [rows]);
  const quorumMet = present >= Math.ceil(total / 2);

  return (
    <div className={cn("space-y-4 text-white", MARKETING_CHAMBER_PREVIEW)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-white">✅ {tc("rollCallTracker")}</h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider",
            quorumMet
              ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
              : "border border-amber-400/40 bg-amber-500/10 text-amber-200"
          )}
        >
          {quorumMet ? t("quorumMet") : t("quorumNotMet")} · {t("quorumCount", { present, total })}
        </span>
      </div>
      <div className={cn(MARKETING_DARK_GLASS_CARD, "space-y-3")}>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-lg border border-white/12 bg-black/15 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium">{row.country}</span>
              <div className="flex flex-wrap gap-1.5">
                {ROLL_ATTENDANCE_BUTTONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, status: opt.value } : r))
                      )
                    }
                    className={marketingRollAttendanceButtonClass(
                      opt.value,
                      row.status === opt.value
                    )}
                  >
                    {tc(opt.labelKey)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs text-white/60">{t("votingHeadcount", { voting, present })}</p>
      </div>
    </div>
  );
}

export function ChairSpeakersTimerDemo() {
  const t = useTranslations("marketing.rolePreviews.chair");
  const [queue, setQueue] = useState(["Norway", "Spain", "Italy", "Kenya", "Mexico"]);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? (setRunning(false), 0) : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft]);

  const advance = () => {
    setQueue((prev) => {
      if (prev.length < 2) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    setSecondsLeft(90);
    setRunning(true);
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("speakersLabel")}</span>
      <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_10%,#ffffff)] px-3 py-2.5">
        <p className="text-xs text-zinc-500">{t("nowSpeaking")}</p>
        <div className="mt-0.5 flex items-end justify-between">
          <p className={cn("text-base", PREVIEW_HEADING)}>{queue[0]}</p>
          <p className="font-mono text-sm font-semibold text-[var(--accent)]" suppressHydrationWarning>
            {formatTimer(secondsLeft)}
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900"
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? t("pause") : t("start")}
          </button>
          <button
            type="button"
            onClick={advance}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-900"
          >
            <SkipForward className="h-3.5 w-3.5" />
            {t("nextSpeaker")}
          </button>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-zinc-600">
        {queue.slice(1).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

export function ChairMotionQueueDemo() {
  const t = useTranslations("marketing.rolePreviews.chair");
  const [motions, setMotions] = useState([
    { id: "1", title: "Closure of debate", sponsor: "Kenya" },
    { id: "2", title: "Moderated caucus — 10 min", sponsor: "Norway" },
    { id: "3", title: "Introduce draft resolution A", sponsor: "Mexico" },
    { id: "4", title: "Point of order", sponsor: "Philippines" },
  ]);

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= motions.length) return;
    setMotions((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("motionQueueLabel")}</span>
      <p className="mt-1 text-xs text-zinc-500">{t("motionQueueHint")}</p>
      <ol className="mt-3 space-y-2">
        {motions.map((motion, i) => (
          <li
            key={motion.id}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2",
              i === 0
                ? "border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_8%,#fff)]"
                : "border-zinc-200 bg-zinc-50"
            )}
          >
            <span className="font-mono text-xs font-bold text-[var(--accent)]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">{motion.title}</p>
              <p className="text-xs text-zinc-500">{motion.sponsor}</p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                aria-label={t("moveUp")}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={t("moveDown")}
                disabled={i === motions.length - 1}
                onClick={() => move(i, 1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ChairMotionVoteDemo() {
  const t = useTranslations("marketing.rolePreviews.chair");
  const [choice, setChoice] = useState<"in_favor" | "against" | null>(null);
  const [yes, setYes] = useState(11);
  const [no, setNo] = useState(4);
  const needed = 12;
  const total = 17;

  const cast = (next: "in_favor" | "against") => {
    setChoice((prev) => {
      if (prev === "in_favor") setYes((n) => n - 1);
      if (prev === "against") setNo((n) => n - 1);
      if (next === "in_favor" && prev !== "in_favor") setYes((n) => n + 1);
      if (next === "against" && prev !== "against") setNo((n) => n + 1);
      return prev === next ? null : next;
    });
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("voteLabel")}</span>
      <p className={cn("mt-2 text-base", PREVIEW_HEADING)}>{t("voteTitle")}</p>
      <p className={cn("mt-1", PREVIEW_MUTED)}>{t("voteMeta", { yes, no, needed, total })}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${Math.min(100, (yes / needed) * 100)}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => cast("in_favor")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            choice === "in_favor"
              ? "bg-[color-mix(in_srgb,var(--accent)_22%,#fff)] text-[var(--accent)] ring-2 ring-[var(--accent)]/40"
              : "bg-[color-mix(in_srgb,var(--accent)_12%,#fff)] text-[var(--accent)]"
          )}
        >
          {t("inFavor")}
        </button>
        <button
          type="button"
          onClick={() => cast("against")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            choice === "against"
              ? "border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-300"
              : "border-zinc-200 text-zinc-600"
          )}
        >
          {t("against")}
        </button>
      </div>
    </div>
  );
}

const TIMER_PRESETS = [
  { id: "gsl", labelKey: "timerGsl", seconds: 90 },
  { id: "mod", labelKey: "timerMod", seconds: 600 },
  { id: "unmod", labelKey: "timerUnmod", seconds: 300 },
  { id: "reading", labelKey: "timerReading", seconds: 180 },
] as const;

export function ChairSessionTimerDemo() {
  const t = useTranslations("marketing.rolePreviews.chair");
  const [presetId, setPresetId] = useState<(typeof TIMER_PRESETS)[number]["id"]>("gsl");
  const preset = TIMER_PRESETS.find((p) => p.id === presetId) ?? TIMER_PRESETS[0];
  const [secondsLeft, setSecondsLeft] = useState<number>(preset.seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(preset.seconds);
    setRunning(false);
  }, [preset.seconds, presetId]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft]);

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("timerLabel")}</span>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TIMER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPresetId(p.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold",
              presetId === p.id
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,#fff)] text-[var(--accent)]"
                : "border-zinc-200 text-zinc-600"
            )}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center font-mono text-4xl font-bold tabular-nums text-zinc-900" suppressHydrationWarning>
        {formatTimer(secondsLeft)}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? t("pause") : t("start")}
        </button>
        <button
          type="button"
          onClick={() => {
            setSecondsLeft(preset.seconds);
            setRunning(false);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("reset")}
        </button>
      </div>
    </div>
  );
}

export function ChairAwardsRubricDemo() {
  const t = useTranslations("marketing.rolePreviews.chair");
  const [scores, setScores] = useState<Record<string, number>>({
    Kenya: 4,
    Norway: 5,
    Mexico: 3,
    Philippines: 2,
  });

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("awardsLabel")}</span>
      <p className="mt-1 text-xs text-zinc-500">{t("awardsHint")}</p>
      <ul className="mt-3 space-y-2">
        {Object.keys(scores).map((name) => (
          <li
            key={name}
            className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
          >
            <span className="text-sm font-medium text-zinc-900">{name}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={t("scoreStar", { score: n, delegate: name })}
                  onClick={() => setScores((prev) => ({ ...prev, [name]: n }))}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      n <= scores[name] ? "fill-amber-400 text-amber-400" : "text-zinc-300"
                    )}
                  />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DelegatePrepHubDemo() {
  const t = useTranslations("marketing.preview");
  const keys = ["documents", "resolutions", "speeches", "stances"] as const;
  const [active, setActive] = useState<string>("documents");

  return (
    <div className="grid grid-cols-2 gap-3">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setActive(key)}
          className={cn(
            "rounded-2xl border p-4 text-left [color-scheme:light]",
            active === key
              ? "border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_10%,#fff)]"
              : "border-zinc-200 bg-white"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t(`prepTile.${key}`)}</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {active === key ? t("prepActive") : t("prepReady")}
          </p>
        </button>
      ))}
    </div>
  );
}

export function DelegateResolutionClausesDemo() {
  const t = useTranslations("marketing.rolePreviews.delegate");
  const [clauses, setClauses] = useState([
    "Calls upon Member States to expand climate finance access;",
    "Encourages bilateral technology-transfer partnerships;",
    "Requests the Secretary-General to report annually.",
  ]);
  const [draft, setDraft] = useState("");

  const addClause = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setClauses((prev) => [...prev, trimmed.endsWith(";") ? trimmed : `${trimmed};`]);
    setDraft("");
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("resolutionLabel")}</span>
      <ol className="mt-3 space-y-2">
        {clauses.map((clause, i) => (
          <li
            key={`${i}-${clause}`}
            className="flex gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          >
            <span className="font-mono text-xs font-bold text-[var(--accent)]">{i + 1}.</span>
            <span className="flex-1">{clause}</span>
            <button
              type="button"
              aria-label={t("removeClause")}
              onClick={() => setClauses((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-zinc-400 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("clausePlaceholder")}
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
        />
        <button
          type="button"
          onClick={addClause}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addClause")}
        </button>
      </div>
    </div>
  );
}

export function DelegateAmendmentFloorDemo() {
  const t = useTranslations("marketing.rolePreviews.delegate");
  const [votes, setVotes] = useState({ yes: 8, no: 5, abstain: 2 });
  const [cast, setCast] = useState<string | null>(null);

  const vote = (key: "yes" | "no" | "abstain") => {
    setVotes((prev) => {
      const next = { ...prev };
      if (cast === "yes") next.yes--;
      if (cast === "no") next.no--;
      if (cast === "abstain") next.abstain--;
      if (cast !== key) next[key]++;
      return next;
    });
    setCast((prev) => (prev === key ? null : key));
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("amendmentLabel")}</span>
      <p className={cn("mt-2 text-sm", PREVIEW_HEADING)}>{t("amendmentTitle")}</p>
      <p className="mt-1 text-xs text-zinc-500">{t("amendmentHint")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(["yes", "no", "abstain"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => vote(key)}
            className={cn(
              "rounded-xl border px-2 py-2 text-xs font-semibold",
              cast === key
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,#fff)] text-[var(--accent)]"
                : "border-zinc-200 text-zinc-700"
            )}
          >
            {t(key)}
            <span className="mt-0.5 block font-mono text-base">{votes[key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type ChatMsg = { id: string; from: string; text: string };

export function DelegateBlocMessagingDemo() {
  const t = useTranslations("marketing.rolePreviews.delegate");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "1", from: "Kenya", text: "Can we align on operative clause 2?" },
    { id: "2", from: "Norway", text: "Yes — suggest merging with our language on finance." },
  ]);
  const [draft, setDraft] = useState("");

  const send = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: String(Date.now()), from: "You", text: trimmed }]);
    setDraft("");
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("blocLabel")}</span>
      <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              msg.from === "You"
                ? "ml-6 bg-[color-mix(in_srgb,var(--accent)_12%,#fff)] text-zinc-900"
                : "mr-6 border border-zinc-200 bg-zinc-50 text-zinc-800"
            )}
          >
            <p className="text-xs font-semibold text-zinc-500">{msg.from}</p>
            <p className="mt-0.5">{msg.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("messagePlaceholder")}
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
        />
        <button type="button" onClick={send} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-white" aria-label={t("send")}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const STANCE_CYCLE = ["support", "oppose", "neutral", "undecided"] as const;
type Stance = (typeof STANCE_CYCLE)[number];

const STANCE_COLORS: Record<Stance, string> = {
  support: "bg-emerald-500/80 text-white",
  oppose: "bg-rose-500/80 text-white",
  neutral: "bg-zinc-400/80 text-white",
  undecided: "bg-amber-400/90 text-zinc-900",
};

export function DelegateStanceHeatmapDemo() {
  const t = useTranslations("marketing.rolePreviews.delegate");
  const countries = ["Kenya", "Norway", "Mexico", "Peru", "Spain", "Ghana", "Japan", "France"];
  const [stances, setStances] = useState<Record<string, Stance>>({
    Kenya: "support",
    Norway: "support",
    Mexico: "neutral",
    Peru: "undecided",
    Spain: "oppose",
    Ghana: "support",
    Japan: "neutral",
    France: "oppose",
  });

  const cycle = (country: string) => {
    setStances((prev) => {
      const current = prev[country] ?? "undecided";
      const idx = STANCE_CYCLE.indexOf(current);
      const next = STANCE_CYCLE[(idx + 1) % STANCE_CYCLE.length];
      return { ...prev, [country]: next };
    });
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("stanceLabel")}</span>
      <p className="mt-1 text-xs text-zinc-500">{t("stanceHint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {countries.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => cycle(c)}
            className={cn(
              "rounded-lg px-2 py-2 text-center text-xs font-semibold transition",
              STANCE_COLORS[stances[c] ?? "undecided"]
            )}
          >
            <span className="block truncate">{c}</span>
            <span className="mt-0.5 block text-[0.65rem] font-normal opacity-90">
              {t(`stance_${stances[c] ?? "undecided"}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DelegateSpeechPlannerDemo() {
  const t = useTranslations("marketing.rolePreviews.delegate");
  const [points, setPoints] = useState([
    { id: "1", text: "Open with national priority on climate adaptation", done: true },
    { id: "2", text: "Reference operative clause on finance mechanisms", done: false },
    { id: "3", text: "Close with call for bloc consensus", done: false },
  ]);
  const [draft, setDraft] = useState("");

  const toggle = (id: string) => {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  };

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setPoints((prev) => [...prev, { id: String(Date.now()), text: trimmed, done: false }]);
    setDraft("");
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("speechLabel")}</span>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p.id} className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <button
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                p.done ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-zinc-300 bg-white"
              )}
              aria-label={p.done ? t("markUndone") : t("markDone")}
            >
              {p.done ? <Check className="h-3 w-3" /> : null}
            </button>
            <span className={cn("text-sm", p.done ? "text-zinc-400 line-through" : "text-zinc-800")}>{p.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("speechPlaceholder")}
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
        />
        <button type="button" onClick={add} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold">
          {t("addPoint")}
        </button>
      </div>
    </div>
  );
}

const SMT_CHAMBERS = ["ECOSOC", "Legal", "WHO", "Press Corps"] as const;

export function SmtLiveOversightDemo() {
  const t = useTranslations("marketing.preview");
  const [liveId, setLiveId] = useState<string>("ECOSOC");

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("smtLabel")}</span>
      <ul className="mt-3 space-y-2">
        {SMT_CHAMBERS.map((committee) => {
          const live = liveId === committee;
          return (
            <li key={committee}>
              <button
                type="button"
                onClick={() => setLiveId(committee)}
                className={cn(
                  PREVIEW_ROW,
                  live && "border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_8%,#fff)]"
                )}
              >
                <span className="font-medium">{committee}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className={cn("h-2 w-2 rounded-full", live ? "bg-[var(--accent)]" : "bg-zinc-300")} />
                  {live ? t("smtLive") : t("smtIdle")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SmtAllocationMatrixDemo() {
  const t = useTranslations("marketing.rolePreviews.secretariat");
  const pool = ["Canada", "Ghana", "Peru", "Sweden", "Spain", "Italy"];
  const [matrix, setMatrix] = useState(["Kenya", "Norway", "Mexico", "—", "Philippines", "—"]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  const assign = (index: number) => {
    if (!selectedPool) return;
    setMatrix((prev) => {
      const next = [...prev];
      next[index] = selectedPool;
      return next;
    });
    setSelectedPool(null);
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("allocationLabel")}</span>
      <p className="mt-1 text-xs text-zinc-500">{t("allocationHint")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {matrix.map((seat, i) => (
          <button
            key={i}
            type="button"
            onClick={() => assign(i)}
            className={cn(
              "rounded-lg border px-2 py-3 text-center text-xs font-semibold",
              seat === "—"
                ? "border-dashed border-zinc-300 text-zinc-400"
                : "border-zinc-200 bg-zinc-50 text-zinc-900"
            )}
          >
            {seat}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("poolLabel")}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pool.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedPool(c)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold",
              selectedPool === c
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,#fff)] text-[var(--accent)]"
                : "border-zinc-200 text-zinc-600"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SmtGateCodesDemo() {
  const t = useTranslations("marketing.rolePreviews.secretariat");
  const [codes, setCodes] = useState({
    event: "IMUN-7K2P",
    room: "ROOM-4F9A",
    committee: "ECOSOC-3M1",
  });
  const [copied, setCopied] = useState<string | null>(null);

  const rotate = () => {
    const rand = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    setCodes({
      event: `IMUN-${rand()}`,
      room: `ROOM-${rand()}`,
      committee: `ECO-${rand()}`,
    });
  };

  const copy = async (key: keyof typeof codes) => {
    await navigator.clipboard.writeText(codes[key]);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("gatesLabel")}</span>
      <ul className="mt-3 space-y-2">
        {(["event", "room", "committee"] as const).map((key) => (
          <li key={key} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div>
              <p className="text-xs text-zinc-500">{t(`gate_${key}`)}</p>
              <p className="font-mono text-sm font-bold text-zinc-900">{codes[key]}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(key)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-white"
              aria-label={t("copyCode")}
            >
              {copied === key ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={rotate}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {t("rotateCodes")}
      </button>
    </div>
  );
}

export function SmtAwardsReviewDemo() {
  const t = useTranslations("marketing.rolePreviews.secretariat");
  type NominationStatus = "pending" | "approved" | "rejected";
  const [nominations, setNominations] = useState<
    { id: string; delegate: string; award: string; status: NominationStatus }[]
  >([
    { id: "1", delegate: "Norway", award: "Best Delegate", status: "pending" },
    { id: "2", delegate: "Kenya", award: "Outstanding", status: "pending" },
    { id: "3", delegate: "Mexico", award: "Honorable", status: "pending" },
  ]);

  const review = (id: string, approved: boolean) => {
    setNominations((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: approved ? ("approved" as const) : ("rejected" as const) } : n
      )
    );
  };

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("awardsReviewLabel")}</span>
      <ul className="mt-3 space-y-2">
        {nominations.map((n) => (
          <li key={n.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{n.delegate}</p>
                <p className="text-xs text-zinc-500">{n.award}</p>
              </div>
              {n.status === "pending" ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => review(n.id, true)}
                    className="rounded-lg bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white"
                  >
                    {t("approve")}
                  </button>
                  <button
                    type="button"
                    onClick={() => review(n.id, false)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600"
                  >
                    {t("reject")}
                  </button>
                </div>
              ) : (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    n.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  )}
                >
                  {t(n.status)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SmtEventScheduleDemo() {
  const t = useTranslations("marketing.rolePreviews.secretariat");
  const [sessions, setSessions] = useState([
    { id: "1", time: "09:00", title: "Opening ceremony", on: true },
    { id: "2", time: "10:30", title: "ECOSOC — Session I", on: true },
    { id: "3", time: "14:00", title: "Legal — Session I", on: false },
    { id: "4", time: "16:30", title: "Press briefing", on: true },
  ]);

  return (
    <div className={PREVIEW_CARD}>
      <span className={PREVIEW_LABEL}>{t("scheduleLabel")}</span>
      <ul className="mt-3 space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div>
              <p className="font-mono text-xs text-zinc-500">{s.time}</p>
              <p className="text-sm font-medium text-zinc-900">{s.title}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={s.on}
              onClick={() =>
                setSessions((prev) => prev.map((row) => (row.id === s.id ? { ...row, on: !row.on } : row)))
              }
              className={cn("relative h-6 w-11 rounded-full transition", s.on ? "bg-[var(--accent)]" : "bg-zinc-300")}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                  s.on ? "left-[1.35rem]" : "left-0.5"
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SmtSetupChecklistDemo() {
  const t = useTranslations("marketing.rolePreviews.secretariat");
  const [items, setItems] = useState([
    { id: "1", labelKey: "check_allocations", done: true },
    { id: "2", labelKey: "check_gates", done: true },
    { id: "3", labelKey: "check_chairs", done: false },
    { id: "4", labelKey: "check_topics", done: false },
    { id: "5", labelKey: "check_newsroom", done: false },
  ]);

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className={PREVIEW_CARD}>
      <div className="flex items-center justify-between gap-2">
        <span className={PREVIEW_LABEL}>{t("checklistLabel")}</span>
        <span className="font-mono text-xs text-zinc-500">
          {doneCount}/{items.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-[var(--accent)] transition-all"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)))
              }
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-800"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  item.done ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-zinc-300 bg-white"
                )}
              >
                {item.done ? <Check className="h-3 w-3" /> : null}
              </span>
              {t(item.labelKey)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
