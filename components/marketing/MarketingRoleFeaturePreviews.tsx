"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  SkipForward,
  Trash2,
} from "lucide-react";
import type { RollAttendance } from "@/lib/roll-attendance";
import { ROLL_ATTENDANCE_BUTTONS } from "@/lib/roll-call-attendance-buttons";
import { MarketingAllocationMatrixPanel } from "@/components/marketing/MarketingAllocationMatrixPanel";
import { MarketingChairAwardsRubricPanel } from "@/components/marketing/MarketingChairAwardsRubricPanel";
import { MarketingAwardsReviewPanel } from "@/components/marketing/MarketingAwardsReviewPanel";
import { MarketingDelegatePrepWorkspacePanel } from "@/components/marketing/MarketingDelegatePrepWorkspacePanel";
import { MarketingEventSchedulePanel } from "@/components/marketing/MarketingEventSchedulePanel";
import { MarketingGateCodesPanel } from "@/components/marketing/MarketingGateCodesPanel";
import { MarketingSetupChecklistPanel } from "@/components/marketing/MarketingSetupChecklistPanel";
import { MarketingSessionLiveCommitteesPanel } from "@/components/marketing/MarketingSessionLiveCommitteesPanel";
import { MarketingSessionMotionQueuePanel } from "@/components/marketing/MarketingSessionMotionQueuePanel";
import { MarketingSessionSpeakersPanel } from "@/components/marketing/MarketingSessionSpeakersPanel";
import { MarketingSessionVoteRecordingPanel } from "@/components/marketing/MarketingSessionVoteRecordingPanel";
import {
  MARKETING_CHAMBER_PREVIEW,
  MARKETING_DARK_GLASS_CARD,
  marketingRollAttendanceButtonClass,
  PREVIEW_CARD,
  PREVIEW_HEADING,
  PREVIEW_LABEL,
  PREVIEW_MUTED,
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
  return <MarketingSessionSpeakersPanel />;
}

export function ChairMotionQueueDemo() {
  return <MarketingSessionMotionQueuePanel />;
}

export function ChairMotionVoteDemo() {
  return <MarketingSessionVoteRecordingPanel />;
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
  return <MarketingChairAwardsRubricPanel />;
}

export function DelegatePrepHubDemo() {
  return <MarketingDelegatePrepWorkspacePanel />;
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

export function SmtLiveOversightDemo() {
  return <MarketingSessionLiveCommitteesPanel />;
}

export function SmtAllocationMatrixDemo() {
  return <MarketingAllocationMatrixPanel />;
}

export function SmtGateCodesDemo() {
  return <MarketingGateCodesPanel />;
}

export function SmtAwardsReviewDemo() {
  return <MarketingAwardsReviewPanel />;
}

export function SmtEventScheduleDemo() {
  return <MarketingEventSchedulePanel />;
}

export function SmtSetupChecklistDemo() {
  return <MarketingSetupChecklistPanel />;
}
