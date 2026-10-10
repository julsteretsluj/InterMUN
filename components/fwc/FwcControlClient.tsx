// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  advanceFwcCrisisUpdate,
  advanceFwcMotionRound,
  announceFwcDayOutcome,
  applyFwcCharacterStatus,
  clearFwcCharacterStatus,
  controlHawkinsClock,
  postFwcAnnouncement,
  recordFwcPowerUse,
  resolveFwcFloorRequest,
  saveFwcCrisisUpdate,
  updateFwcCharacterMeters,
  updateFwcCounters,
  updateFwcInventoryItem,
  voidFwcPowerUse,
  type FwcResultsRow,
} from "@/app/actions/fwcRop";
import { FWC_ROP } from "@/lib/rop";
import { motionPassesUnopposed } from "@/lib/rop/procedure";
import type {
  FwcCrisisUpdateView,
  FwcFloorRequestView,
  FwcInventoryView,
  FwcPowerView,
  FwcStatusView,
} from "@/lib/fwc/rop-page-data";
import {
  formatWhen,
  RopButton,
  RopCard,
  RopField,
  RopHeading,
  RopNotice,
  RopStatusPill,
  ropInputClass,
  useFwcRealtimeRefresh,
} from "@/components/fwc/rop-ui";

export type FwcControlSeat = {
  allocationId: string;
  name: string;
  cabinet: string | null;
  powers: FwcPowerView[];
  statuses: FwcStatusView[];
  uses: {
    id: string;
    powerKey: string;
    label: string;
    crisisDay: number;
    crisisSession: number;
    note: string | null;
    createdAt: string;
  }[];
  meters: { key: string; label: string; value: number; max: number }[];
};

type Result = { ok: boolean; error?: string };

const CRISIS = FWC_ROP.crisis!;
const cabinetLabel = (key: string | null) => CRISIS.cabinets.find((c) => c.key === key)?.label ?? key ?? "—";

export function FwcControlClient(props: {
  conferenceId: string;
  canonicalConferenceId: string;
  state: {
    crisisDay: number;
    crisisSession: number;
    modCaucusCount: number;
    motionRound: number;
    isLastSession: boolean;
    clockPaused: boolean;
  };
  updates: FwcCrisisUpdateView[];
  floor: FwcFloorRequestView[];
  inventory: FwcInventoryView[];
  seats: FwcControlSeat[];
  results: FwcResultsRow[];
  nameByAllocationId: Record<string, string>;
}) {
  const t = useTranslations("fwcRop");
  useFwcRealtimeRefresh(props.canonicalConferenceId, [
    "fwc_session_state",
    "fwc_crisis_updates",
    "fwc_pathway_votes",
    "fwc_floor_requests",
    "fwc_character_statuses",
    "fwc_power_uses",
    "fwc_character_states",
    "fwc_inventory_items",
    "fwc_directives",
  ]);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = (fn: () => Promise<Result>, ok: string, after?: () => void) => {
    setMessage(null);
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? { tone: "ok", text: ok } : { tone: "error", text: res.error ?? t("genericError") });
      if (res.ok) after?.();
    });
  };
  const ctx = { conferenceId: props.conferenceId, pending, run };

  return (
    <div className="space-y-6">
      {message ? <RopNotice tone={message.tone}>{message.text}</RopNotice> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <ClockAndCounters {...ctx} state={props.state} />
          <FloorQueue {...ctx} floor={props.floor} motionRound={props.state.motionRound} />
          <Announcement {...ctx} />
        </div>
        <CrisisUpdates {...ctx} updates={props.updates} />
      </div>
      <Characters {...ctx} seats={props.seats} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Inventory {...ctx} inventory={props.inventory} seats={props.seats} nameByAllocationId={props.nameByAllocationId} />
        <DayOutcome {...ctx} crisisDay={props.state.crisisDay} results={props.results} />
      </div>
    </div>
  );
}

type Ctx = { conferenceId: string; pending: boolean; run: (fn: () => Promise<Result>, ok: string, after?: () => void) => void };

function ClockAndCounters({ conferenceId, pending, run, state }: Ctx & { state: Parameters<typeof FwcControlClient>[0]["state"] }) {
  const t = useTranslations("fwcRop");
  const [time, setTime] = useState("12:00");
  const [day, setDay] = useState(1);
  const [counters, setCounters] = useState(state);
  const num = (k: keyof typeof counters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCounters((c) => ({ ...c, [k]: Number(e.target.value) }));
  return (
    <RopCard>
      <RopHeading hint={t("clockHint")}>{t("clockHeading")}</RopHeading>
      <div className="flex flex-wrap items-end gap-3">
        <RopField label={t("clockTime")}>
          <input className={`${ropInputClass} w-28`} value={time} onChange={(e) => setTime(e.target.value)} placeholder="14:30" />
        </RopField>
        {CRISIS.clock.carryOverBetweenSessions ? (
          <RopField label={t("clockDay")}>
            <input type="number" min={1} className={`${ropInputClass} w-20`} value={day} onChange={(e) => setDay(Number(e.target.value))} />
          </RopField>
        ) : null}
        <RopButton tone="primary" disabled={pending} onClick={() => run(() => controlHawkinsClock({ conferenceId, action: "set", time, day }), t("clockSet"))}>
          {t("clockSetButton")}
        </RopButton>
        {state.clockPaused ? (
          <RopButton disabled={pending} onClick={() => run(() => controlHawkinsClock({ conferenceId, action: "resume" }), t("clockResumed"))}>
            {t("clockResume")}
          </RopButton>
        ) : (
          <RopButton disabled={pending} onClick={() => run(() => controlHawkinsClock({ conferenceId, action: "pause" }), t("clockPausedOk"))}>
            {t("clockPause")}
          </RopButton>
        )}
      </div>

      <div className="mt-6 border-t border-[#D1D1D6] pt-5">
        <h3 className="mb-3 text-[14px] font-semibold text-[#1D1D1F]">{t("countersHeading")}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RopField label={t("counterDay")}>
            <input type="number" min={1} className={ropInputClass} value={counters.crisisDay} onChange={num("crisisDay")} />
          </RopField>
          <RopField label={t("counterSession")}>
            <input type="number" min={1} className={ropInputClass} value={counters.crisisSession} onChange={num("crisisSession")} />
          </RopField>
          <RopField label={t("counterModCaucus")}>
            <input type="number" min={0} className={ropInputClass} value={counters.modCaucusCount} onChange={num("modCaucusCount")} />
          </RopField>
          <RopField label={t("counterMotionRound")}>
            <input type="number" min={1} className={ropInputClass} value={counters.motionRound} onChange={num("motionRound")} />
          </RopField>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[13px] text-[#1D1D1F]">
          <input
            type="checkbox"
            checked={counters.isLastSession}
            onChange={(e) => setCounters((c) => ({ ...c, isLastSession: e.target.checked }))}
          />
          {t("counterLastSession")}
        </label>
        <p className="mt-2 text-[12px] text-[#6E6E73]">{t("countersHint")}</p>
        <RopButton
          className="mt-3"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                updateFwcCounters({
                  conferenceId,
                  crisisDay: counters.crisisDay !== state.crisisDay ? counters.crisisDay : undefined,
                  crisisSession: counters.crisisSession,
                  modCaucusCount: counters.modCaucusCount,
                  motionRound: counters.motionRound,
                  isLastSession: counters.isLastSession,
                }),
              t("countersSaved")
            )
          }
        >
          {t("countersSave")}
        </RopButton>
      </div>
    </RopCard>
  );
}

function FloorQueue({ conferenceId, pending, run, floor, motionRound }: Ctx & { floor: FwcFloorRequestView[]; motionRound: number }) {
  const t = useTranslations("fwcRop");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const resolve = (id: string, decision: "accept" | "pass_unopposed" | "reject" | "resolved") =>
    run(
      () => resolveFwcFloorRequest({ conferenceId, id, decision, note: notes[id] ?? null, voteConferenceId: conferenceId }),
      t(`floorDecision.${decision}`)
    );
  const motions = floor.filter((f) => f.kind === "motion");
  const points = floor.filter((f) => f.kind === "point");
  return (
    <RopCard>
      <RopHeading hint={t("floorQueueHint", { round: motionRound })}>{t("floorQueue")}</RopHeading>
      {floor.length === 0 ? <p className="text-[13px] text-[#6E6E73]">{t("floorQueueEmpty")}</p> : null}
      <ul className="space-y-3">
        {[...points, ...motions].map((f) => {
          const unopposed = f.kind === "motion" && motionPassesUnopposed(FWC_ROP, f.seconds.length, f.objections.length);
          const detail = Object.entries(f.details)
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(" · ");
          return (
            <li key={f.id} className="rounded-[12px] border border-[#D1D1D6] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-semibold text-[#1D1D1F]">
                  {f.label} <span className="font-normal text-[#6E6E73]">· {f.name}</span>
                </p>
                <span className="text-[12px] text-[#6E6E73]">{formatWhen(f.createdAt)}</span>
              </div>
              {detail ? <p className="mt-1 text-[12px] text-[#6E6E73]">{detail}</p> : null}
              {f.kind === "motion" ? (
                <p className="mt-1 text-[12px] text-[#6E6E73]">
                  {t("secondsObjections", { s: f.seconds.length, o: f.objections.length })}
                </p>
              ) : null}
              <input
                className={`${ropInputClass} mt-2`}
                placeholder={t("chairNotePlaceholder")}
                value={notes[f.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {f.kind === "motion" ? (
                  <>
                    <RopButton tone="primary" disabled={pending} onClick={() => resolve(f.id, "accept")}>
                      {t("floorAccept")}
                    </RopButton>
                    <RopButton disabled={pending || !unopposed} onClick={() => resolve(f.id, "pass_unopposed")}>
                      {t("floorPassUnopposed")}
                    </RopButton>
                  </>
                ) : (
                  <RopButton tone="primary" disabled={pending} onClick={() => resolve(f.id, "resolved")}>
                    {t("floorResolved")}
                  </RopButton>
                )}
                <RopButton tone="danger" disabled={pending} onClick={() => resolve(f.id, "reject")}>
                  {t("floorReject")}
                </RopButton>
              </div>
            </li>
          );
        })}
      </ul>
      <RopButton className="mt-4" disabled={pending} onClick={() => run(() => advanceFwcMotionRound({ conferenceId }), t("roundAdvanced"))}>
        {t("advanceRound")}
      </RopButton>
    </RopCard>
  );
}

function Announcement({ conferenceId, pending, run }: Ctx) {
  const t = useTranslations("fwcRop");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <RopCard>
      <RopHeading hint={t("announceHint")}>{t("announceHeading")}</RopHeading>
      <div className="space-y-3">
        <input className={ropInputClass} placeholder={t("announceTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${ropInputClass} min-h-20`} placeholder={t("announceBody")} value={body} onChange={(e) => setBody(e.target.value)} />
        <RopButton
          tone="primary"
          disabled={pending || !title.trim()}
          onClick={() =>
            run(() => postFwcAnnouncement({ conferenceId, title, body }), t("announcePosted"), () => {
              setTitle("");
              setBody("");
            })
          }
        >
          {t("announcePost")}
        </RopButton>
      </div>
    </RopCard>
  );
}

type PathwayDraft = { key?: string; label: string; description: string };
const emptyPathways = (): PathwayDraft[] => [
  { label: "", description: "" },
  { label: "", description: "" },
];

function CrisisUpdates({ conferenceId, pending, run, updates }: Ctx & { updates: FwcCrisisUpdateView[] }) {
  const t = useTranslations("fwcRop");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isBreach, setIsBreach] = useState(true);
  const [pathways, setPathways] = useState<PathwayDraft[]>(emptyPathways);
  const [tieBreak, setTieBreak] = useState<Record<string, string>>({});

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setIsBreach(true);
    setPathways(emptyPathways());
  };
  const edit = (u: FwcCrisisUpdateView) => {
    setEditingId(u.id);
    setTitle(u.title);
    setBody(u.body);
    setIsBreach(u.isBreach);
    setPathways(u.pathways.map((p) => ({ key: p.key, label: p.label, description: p.description })));
  };
  const setPath = (i: number, patch: Partial<PathwayDraft>) =>
    setPathways((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <RopCard>
      <RopHeading hint={t("updatesHint", { s: CRISIS.qaSeconds / 60 })}>{t("updatesHeading")}</RopHeading>
      <div className="space-y-3 rounded-[16px] bg-[#F2F2F7] p-4">
        <input className={ropInputClass} placeholder={t("updateTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${ropInputClass} min-h-28`} placeholder={t("updateBody")} value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="flex items-center gap-2 text-[13px] text-[#1D1D1F]">
          <input type="checkbox" checked={isBreach} onChange={(e) => setIsBreach(e.target.checked)} />
          {t("updateIsBreach")}
        </label>
        <p className="text-[13px] font-semibold text-[#1D1D1F]">{t("pathways")}</p>
        {pathways.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto]">
            <input className={ropInputClass} placeholder={t("pathwayLabel", { n: i + 1 })} value={p.label} onChange={(e) => setPath(i, { label: e.target.value })} />
            <input className={ropInputClass} placeholder={t("pathwayDescription")} value={p.description} onChange={(e) => setPath(i, { description: e.target.value })} />
            <RopButton tone="ghost" disabled={pathways.length <= 2} onClick={() => setPathways((ps) => ps.filter((_, j) => j !== i))}>
              {t("remove")}
            </RopButton>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <RopButton tone="ghost" onClick={() => setPathways((ps) => [...ps, { label: "", description: "" }])}>
            {t("addPathway")}
          </RopButton>
          <span className="flex-1" />
          {editingId ? (
            <RopButton tone="ghost" onClick={reset}>
              {t("startNew")}
            </RopButton>
          ) : null}
          <RopButton
            tone="primary"
            disabled={pending || !title.trim()}
            onClick={() =>
              run(
                () => saveFwcCrisisUpdate({ conferenceId, id: editingId, title, body, isBreach, pathways }),
                t("updateSaved"),
                reset
              )
            }
          >
            {editingId ? t("updateSaveEdit") : t("updateSaveDraft")}
          </RopButton>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {updates.length === 0 ? <p className="text-[13px] text-[#6E6E73]">{t("updatesEmpty")}</p> : null}
        {updates.map((u) => {
          const total = Object.values(u.votes).reduce((a, b) => a + b, 0);
          const top = Math.max(0, ...Object.values(u.votes));
          const leaders = u.pathways.filter((p) => (u.votes[p.key] ?? 0) === top && top > 0);
          const tied = leaders.length !== 1;
          return (
            <li key={u.id} className="rounded-[12px] border border-[#D1D1D6] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-[#1D1D1F]">{u.title}</p>
                <RopStatusPill status={u.status === "resolved" ? "approved" : u.status === "draft" ? "draft" : "pending"} label={t(`updateStatus.${u.status}`)} />
              </div>
              {u.body ? <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[13px] text-[#6E6E73]">{u.body}</p> : null}
              <ul className="mt-2 space-y-1">
                {u.pathways.map((p) => (
                  <li key={p.key} className="flex justify-between gap-3 text-[13px]">
                    <span className={u.chosenPathwayKey === p.key ? "font-semibold text-[#1B7F3B]" : "text-[#1D1D1F]"}>{p.label}</span>
                    <span className="tabular-nums text-[#6E6E73]">{u.votes[p.key] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[12px] text-[#AEAEB2]">{t("votesCast", { n: total })}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {u.status === "draft" ? (
                  <>
                    <RopButton tone="primary" disabled={pending} onClick={() => run(() => advanceFwcCrisisUpdate({ conferenceId, id: u.id, to: "qa" }), t("updateQaOpened"))}>
                      {t("updateOpenQa")}
                    </RopButton>
                    <RopButton tone="ghost" onClick={() => edit(u)}>
                      {t("edit")}
                    </RopButton>
                  </>
                ) : null}
                {u.status === "qa" ? (
                  <RopButton tone="primary" disabled={pending} onClick={() => run(() => advanceFwcCrisisUpdate({ conferenceId, id: u.id, to: "choosing" }), t("updateVotingOpened"))}>
                    {t("updateOpenVoting")}
                  </RopButton>
                ) : null}
                {u.status === "choosing" ? (
                  <>
                    {tied ? (
                      <select
                        className={`${ropInputClass} w-auto`}
                        value={tieBreak[u.id] ?? ""}
                        onChange={(e) => setTieBreak((m) => ({ ...m, [u.id]: e.target.value }))}
                      >
                        <option value="">{t("tieBreakPick")}</option>
                        {(leaders.length ? leaders : u.pathways).map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <RopButton
                      tone="primary"
                      disabled={pending || (tied && !tieBreak[u.id])}
                      onClick={() =>
                        run(
                          () => advanceFwcCrisisUpdate({ conferenceId, id: u.id, to: "resolved", chosenPathwayKey: tied ? tieBreak[u.id] : null }),
                          t("updateResolved")
                        )
                      }
                    >
                      {t("updateResolve")}
                    </RopButton>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </RopCard>
  );
}

function Characters({ conferenceId, pending, run, seats }: Ctx & { seats: FwcControlSeat[] }) {
  const t = useTranslations("fwcRop");
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <RopCard>
      <RopHeading hint={t("charactersHint")}>{t("charactersHeading")}</RopHeading>
      <ul className="divide-y divide-[#D1D1D6]/60">
        {seats.map((s) => (
          <li key={s.allocationId} className="py-3">
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-2 text-left"
              onClick={() => setOpenId((id) => (id === s.allocationId ? null : s.allocationId))}
            >
              <span className="text-[14px] font-semibold text-[#1D1D1F]">{s.name}</span>
              <span className="text-[12px] text-[#6E6E73]">{cabinetLabel(s.cabinet)}</span>
              {s.statuses.map((st) => (
                <span key={st.id} className="rounded-[980px] bg-[#FDECEC] px-2 py-0.5 text-[11px] font-semibold text-[#B3261E]">
                  {st.label}
                </span>
              ))}
              <span className="ml-auto text-[12px] text-[#007AFF]">{openId === s.allocationId ? t("collapse") : t("manage")}</span>
            </button>
            {openId === s.allocationId ? <CharacterPanel conferenceId={conferenceId} pending={pending} run={run} seat={s} /> : null}
          </li>
        ))}
      </ul>
    </RopCard>
  );
}

function CharacterPanel({ conferenceId, pending, run, seat }: Ctx & { seat: FwcControlSeat }) {
  const t = useTranslations("fwcRop");
  const [statusKey, setStatusKey] = useState(CRISIS.statuses[0]?.key ?? "");
  const [statusNote, setStatusNote] = useState("");
  const [override, setOverride] = useState(false);
  const [meters, setMeters] = useState<Record<string, number>>(() => Object.fromEntries(seat.meters.map((m) => [m.key, m.value])));
  return (
    <div className="mt-3 grid gap-5 lg:grid-cols-3">
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-[#1D1D1F]">{t("statusesHeading")}</p>
        {seat.statuses.map((st) => (
          <div key={st.id} className="flex items-start justify-between gap-2 rounded-[10px] bg-[#F2F2F7] p-2 text-[12px]">
            <span>
              <span className="font-semibold text-[#1D1D1F]">{st.label}</span>
              <span className="block text-[#6E6E73]">{st.note || st.effect}</span>
            </span>
            <RopButton tone="ghost" disabled={pending} onClick={() => run(() => clearFwcCharacterStatus({ conferenceId, id: st.id }), t("statusCleared"))}>
              {t("clear")}
            </RopButton>
          </div>
        ))}
        <select className={ropInputClass} value={statusKey} onChange={(e) => setStatusKey(e.target.value)}>
          {CRISIS.statuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <input className={ropInputClass} placeholder={t("statusNote")} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
        <RopButton
          disabled={pending}
          onClick={() =>
            run(() => applyFwcCharacterStatus({ conferenceId, allocationId: seat.allocationId, statusKey, note: statusNote }), t("statusApplied"), () =>
              setStatusNote("")
            )
          }
        >
          {t("applyStatus")}
        </RopButton>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-[#1D1D1F]">{t("powers")}</p>
        {seat.powers.map((p) => (
          <div key={p.key} className="flex items-start justify-between gap-2 text-[12px]">
            <span>
              <span className="font-semibold text-[#1D1D1F]">{p.label}</span>
              <span className="block text-[#6E6E73]">
                {p.frequencyLabel} · {p.available ? t("ready") : (p.reason ?? t("used"))}
              </span>
            </span>
            <RopButton
              tone="ghost"
              disabled={pending || (!p.available && !override)}
              onClick={() => run(() => recordFwcPowerUse({ conferenceId, allocationId: seat.allocationId, powerKey: p.key, override }), t("powerRecorded"))}
            >
              {t("recordUse")}
            </RopButton>
          </div>
        ))}
        <label className="flex items-center gap-2 text-[12px] text-[#6E6E73]">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          {t("overrideFrequency")}
        </label>
        {seat.uses.length ? (
          <ul className="space-y-1 border-t border-[#D1D1D6] pt-2">
            {seat.uses.slice(0, 8).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 text-[12px] text-[#6E6E73]">
                <span>
                  {u.label} · {t("dayN", { n: u.crisisDay })} · {t("sessionN", { n: u.crisisSession })}
                </span>
                <RopButton tone="ghost" disabled={pending} onClick={() => run(() => voidFwcPowerUse({ conferenceId, id: u.id }), t("powerVoided"))}>
                  {t("void")}
                </RopButton>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-[#1D1D1F]">{t("metersHeading")}</p>
        {seat.meters.map((m) => (
          <RopField key={m.key} label={`${m.label} (0–${m.max})`}>
            <input
              type="number"
              min={0}
              max={m.max}
              className={ropInputClass}
              value={meters[m.key] ?? 0}
              onChange={(e) => setMeters((x) => ({ ...x, [m.key]: Number(e.target.value) }))}
            />
          </RopField>
        ))}
        {seat.meters.length ? (
          <RopButton disabled={pending} onClick={() => run(() => updateFwcCharacterMeters({ conferenceId, allocationId: seat.allocationId, meters }), t("metersSaved"))}>
            {t("metersSave")}
          </RopButton>
        ) : null}
      </div>
    </div>
  );
}

function Inventory({
  conferenceId,
  pending,
  run,
  inventory,
  seats,
  nameByAllocationId,
}: Ctx & { inventory: FwcInventoryView[]; seats: FwcControlSeat[]; nameByAllocationId: Record<string, string> }) {
  const t = useTranslations("fwcRop");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ cabinet: string; status: string; location: string; holder: string; notes: string }>({
    cabinet: "public",
    status: "",
    location: "",
    holder: "",
    notes: "",
  });
  const begin = (i: FwcInventoryView) => {
    setEditing(i.code);
    setDraft({ cabinet: i.cabinet, status: i.status ?? "", location: i.location ?? "", holder: i.holderAllocationId ?? "", notes: i.notes ?? "" });
  };
  return (
    <RopCard>
      <RopHeading hint={t("inventoryControlHint")}>{t("inventory")}</RopHeading>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-white text-[#6E6E73]">
            <tr>
              <th className="py-2 pr-2 font-semibold">{t("invCode")}</th>
              <th className="py-2 pr-2 font-semibold">{t("invName")}</th>
              <th className="py-2 pr-2 font-semibold">{t("invCabinet")}</th>
              <th className="py-2 pr-2 font-semibold">{t("invStatus")}</th>
              <th className="py-2 pr-2 font-semibold">{t("invHolder")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {inventory.map((i) =>
              editing === i.code ? (
                <tr key={i.code} className="border-t border-[#D1D1D6]/60 align-top">
                  <td className="py-2 pr-2 font-mono">{i.code}</td>
                  <td className="py-2 pr-2">
                    {i.name}
                    <input className={`${ropInputClass} mt-1`} placeholder={t("invLocation")} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
                    <input className={`${ropInputClass} mt-1`} placeholder={t("invNotes")} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                  </td>
                  <td className="py-2 pr-2">
                    <select className={ropInputClass} value={draft.cabinet} onChange={(e) => setDraft({ ...draft, cabinet: e.target.value })}>
                      <option value="public">{t("publicInventory")}</option>
                      {CRISIS.cabinets.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input className={ropInputClass} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />
                  </td>
                  <td className="py-2 pr-2">
                    <select className={ropInputClass} value={draft.holder} onChange={(e) => setDraft({ ...draft, holder: e.target.value })}>
                      <option value="">—</option>
                      {seats.map((s) => (
                        <option key={s.allocationId} value={s.allocationId}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="space-y-1 py-2">
                    <RopButton
                      tone="primary"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            updateFwcInventoryItem({
                              conferenceId,
                              code: i.code,
                              cabinet: draft.cabinet,
                              status: draft.status,
                              location: draft.location,
                              holderAllocationId: draft.holder || null,
                              notes: draft.notes,
                            }),
                          t("inventorySaved"),
                          () => setEditing(null)
                        )
                      }
                    >
                      {t("save")}
                    </RopButton>
                    <RopButton tone="ghost" onClick={() => setEditing(null)}>
                      {t("cancel")}
                    </RopButton>
                  </td>
                </tr>
              ) : (
                <tr key={i.code} className="border-t border-[#D1D1D6]/60">
                  <td className="py-2 pr-2 font-mono">{i.code}</td>
                  <td className="py-2 pr-2 text-[#1D1D1F]">
                    {i.name}
                    {i.location ? <span className="text-[#6E6E73]"> · {i.location}</span> : null}
                  </td>
                  <td className="py-2 pr-2">{i.cabinet === "public" ? t("publicInventory") : cabinetLabel(i.cabinet)}</td>
                  <td className="py-2 pr-2">{i.status ?? "—"}</td>
                  <td className="py-2 pr-2">{i.holderAllocationId ? (nameByAllocationId[i.holderAllocationId] ?? "—") : "—"}</td>
                  <td className="py-2">
                    <RopButton tone="ghost" onClick={() => begin(i)}>
                      {t("edit")}
                    </RopButton>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </RopCard>
  );
}

function DayOutcome({ conferenceId, pending, run, crisisDay, results }: Ctx & { crisisDay: number; results: FwcResultsRow[] }) {
  const t = useTranslations("fwcRop");
  const [day, setDay] = useState(crisisDay);
  const [cabinet, setCabinet] = useState("");
  const [summary, setSummary] = useState("");
  return (
    <RopCard>
      <RopHeading hint={t("dayOutcomeHint")}>{t("dayOutcomeHeading")}</RopHeading>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <RopField label={t("counterDay")}>
            <input type="number" min={1} className={`${ropInputClass} w-20`} value={day} onChange={(e) => setDay(Number(e.target.value))} />
          </RopField>
          <RopField label={t("winningCabinet")}>
            <select className={ropInputClass} value={cabinet} onChange={(e) => setCabinet(e.target.value)}>
              <option value="">{t("noWinner")}</option>
              {CRISIS.cabinets.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </RopField>
        </div>
        <textarea className={`${ropInputClass} min-h-20`} placeholder={t("dayOutcomeSummary")} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <RopButton
          tone="primary"
          disabled={pending}
          onClick={() => run(() => announceFwcDayOutcome({ conferenceId, crisisDay: day, winningCabinet: cabinet || null, summary }), t("dayOutcomeAnnounced"))}
        >
          {t("dayOutcomeAnnounce")}
        </RopButton>
      </div>

      <h3 className="mb-2 mt-6 text-[14px] font-semibold text-[#1D1D1F]">{t("resultsHeading")}</h3>
      <table className="w-full text-left text-[12px]">
        <thead className="text-[#6E6E73]">
          <tr>
            <th className="py-1 pr-2 font-semibold">{t("resultsDelegate")}</th>
            <th className="py-1 pr-2 text-right font-semibold">{t("resultsSubmitted")}</th>
            <th className="py-1 pr-2 text-right font-semibold">{t("resultsApproved")}</th>
            <th className="py-1 text-right font-semibold">{t("resultsRate")}</th>
          </tr>
        </thead>
        <tbody>
          {[...results]
            .sort((a, b) => b.overall.rate - a.overall.rate || b.overall.approved - a.overall.approved)
            .map((r) => (
              <tr key={r.allocationId} className="border-t border-[#D1D1D6]/60">
                <td className="py-1 pr-2 text-[#1D1D1F]">{r.name}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{r.overall.submitted}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{r.overall.approved + r.overall.partial}</td>
                <td className="py-1 text-right tabular-nums">{Math.round(r.overall.rate * 100)}%</td>
              </tr>
            ))}
        </tbody>
      </table>
    </RopCard>
  );
}
