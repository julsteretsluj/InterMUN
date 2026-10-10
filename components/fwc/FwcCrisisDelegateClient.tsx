// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { castFwcPathwayVote, raiseFwcFloorRequest, respondFwcFloorRequest } from "@/app/actions/fwcRop";
import { FWC_ROP } from "@/lib/rop";
import { missingMotionFields, motionAllowedInPhase } from "@/lib/rop/procedure";
import type { RopAssetDef, RopMotionField } from "@/lib/rop/types";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type {
  FwcCrisisUpdateView,
  FwcFeedView,
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
  ropInputClass,
  useFwcRealtimeRefresh,
} from "@/components/fwc/rop-ui";

export function FwcCrisisDelegateClient(props: {
  conferenceId: string;
  canonicalConferenceId: string;
  actingAllocationId: string | null;
  viewer: { allocationId: string; displayName: string; cabinet: string | null } | null;
  phase: "debate" | "voting";
  motionRound: number;
  crisisDay: number;
  updates: FwcCrisisUpdateView[];
  feed: FwcFeedView[];
  floor: FwcFloorRequestView[];
  powers: FwcPowerView[];
  assets: readonly RopAssetDef[];
  statuses: FwcStatusView[];
  meters: { key: string; label: string; value: number; max: number }[];
  mp: { base: number; bonus: number; spent: number } | null;
  inventory: FwcInventoryView[];
  nameByAllocationId: Record<string, string>;
}) {
  const t = useTranslations("fwcRop");
  useFwcRealtimeRefresh(props.canonicalConferenceId, [
    "fwc_crisis_updates",
    "fwc_crisis_feed",
    "fwc_floor_requests",
    "fwc_pathway_votes",
    "fwc_character_statuses",
    "fwc_power_uses",
    "fwc_inventory_items",
    "fwc_session_state",
  ]);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const acting = props.actingAllocationId;
  const live = props.updates.find((u) => u.status === "qa" || u.status === "choosing") ?? null;
  const recent = props.updates.filter((u) => u !== live).slice(0, 3);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) => {
    setMessage(null);
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? { tone: "ok", text: ok } : { tone: "error", text: res.error ?? t("genericError") });
      if (res.ok) after?.();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {live ? (
          <LiveUpdate update={live} canVote={Boolean(props.viewer)} pending={pending} onVote={(key) => run(() => castFwcPathwayVote({ conferenceId: props.conferenceId, crisisUpdateId: live.id, pathwayKey: key, actingAllocationId: acting }), t("voteRecorded"))} />
        ) : (
          <RopCard>
            <RopHeading hint={t("noLiveUpdateHint")}>{t("noLiveUpdate")}</RopHeading>
          </RopCard>
        )}

        {props.viewer ? (
          <FloorPanel
            {...props}
            pending={pending}
            message={message}
            onRaise={(kind, code, details) =>
              run(() => raiseFwcFloorRequest({ conferenceId: props.conferenceId, kind, code, details, actingAllocationId: acting }), kind === "motion" ? t("motionRaised") : t("pointRaised"))
            }
            onRespond={(id, stance) =>
              run(() => respondFwcFloorRequest({ conferenceId: props.conferenceId, id, stance, actingAllocationId: acting }), t("recorded"))
            }
          />
        ) : null}

        <RopCard>
          <RopHeading hint={t("feedHint")}>{t("crisisFeed")}</RopHeading>
          {props.feed.length === 0 ? (
            <p className="text-[13px] text-[#6E6E73]">{t("feedEmpty")}</p>
          ) : (
            <ol className="space-y-4">
              {props.feed.map((f) => (
                <li key={f.id} className="border-l-2 border-[#D1D1D6] pl-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
                    {t(`feedKind.${f.kind}`)} · {formatWhen(f.createdAt)}
                    {f.crisisDay ? ` · ${t("dayN", { n: f.crisisDay })}` : ""}
                  </p>
                  <p className="text-[14px] font-semibold text-[#1D1D1F]">{f.title}</p>
                  {f.body ? <p className="whitespace-pre-wrap text-[13px] text-[#1D1D1F]">{f.body}</p> : null}
                </li>
              ))}
            </ol>
          )}
          {recent.length ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-[12px] font-semibold text-[#007AFF]">{t("earlierUpdates")}</summary>
              <ul className="mt-2 space-y-2">
                {recent.map((u) => (
                  <li key={u.id} className="text-[13px] text-[#1D1D1F]">
                    <span className="font-semibold">{u.title}</span>
                    {u.chosenPathwayKey ? ` → ${u.pathways.find((p) => p.key === u.chosenPathwayKey)?.label ?? u.chosenPathwayKey}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </RopCard>
      </div>

      <div className="space-y-6">
        {props.viewer ? (
          <RopCard>
            <RopHeading hint={props.viewer.cabinet ? t("cabinetX", { x: props.viewer.cabinet }) : undefined}>{props.viewer.displayName}</RopHeading>
            {props.statuses.length ? (
              <div className="mb-4 space-y-2">
                {props.statuses.map((s) => (
                  <RopNotice key={s.id} tone="error">
                    <span className="font-semibold">{s.label}</span> — {s.effect}
                    {s.note ? ` (${s.note})` : ""}
                  </RopNotice>
                ))}
              </div>
            ) : null}
            {props.mp ? (
              <p className="mb-3 text-[13px] text-[#1D1D1F]">
                {t("mpLeft", { left: Math.max(0, props.mp.base - props.mp.spent), base: props.mp.base, bonus: props.mp.bonus })}
              </p>
            ) : null}
            <h3 className="text-[13px] font-semibold text-[#1D1D1F]">{t("powers")}</h3>
            <ul className="mt-2 space-y-1.5">
              {props.powers.map((p) => (
                <li key={p.key} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className={p.available ? "text-[#1D1D1F]" : "text-[#AEAEB2]"}>
                    {p.label}
                    {p.summary ? <span className="block text-[12px] text-[#6E6E73]">{p.summary}</span> : null}
                    <span className="block text-[11px] text-[#AEAEB2]">{p.frequencyLabel}</span>
                  </span>
                  <span className={`shrink-0 text-[11px] font-semibold ${p.available ? "text-[#1B7F3B]" : "text-[#6E6E73]"}`} title={p.reason ?? undefined}>
                    {p.available ? t("ready") : t("used")}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-[13px] font-semibold text-[#1D1D1F]">{t("assets")}</h3>
            {props.assets.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#6E6E73]">{t("noAssetsOnCharacter")}</p>
            ) : (
              <div className="mt-2 space-y-2.5">
                {(["property", "supplies", "allies"] as const).map((cat) => {
                  const list = props.assets.filter((a) => a.category === cat);
                  return list.length ? (
                    <div key={cat}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">{t(`assetCategory.${cat}`)}</p>
                      <ul className="mt-1 space-y-0.5 text-[13px] text-[#1D1D1F]">
                        {list.map((a) => (
                          <li key={a.key}>{a.label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            {props.meters.length ? (
              <div className="mt-4 space-y-2">
                {props.meters.map((m) => (
                  <div key={m.key}>
                    <div className="flex justify-between text-[12px] text-[#6E6E73]">
                      <span>{m.label}</span>
                      <span className="tabular-nums">{m.value}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F2F2F7]">
                      <div className="h-full rounded-full bg-[#007AFF]" style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </RopCard>
        ) : null}

        <RopCard>
          <RopHeading hint={t("inventoryHint")}>{t("inventory")}</RopHeading>
          {["public", ...(props.viewer?.cabinet ? [props.viewer.cabinet] : [])].map((cab) => {
            const items = props.inventory.filter((i) => i.cabinet === cab);
            if (!items.length) return null;
            return (
              <div key={cab} className="mb-4 last:mb-0">
                <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
                  {cab === "public" ? t("publicInventory") : t("cabinetInventory", { x: cab })}
                </h3>
                <ul className="divide-y divide-[#F2F2F7]">
                  {items.map((i) => (
                    <li key={i.code} className="py-1.5 text-[13px]">
                      <span className="font-semibold text-[#1D1D1F]">{i.name}</span>
                      <span className="block text-[11px] text-[#6E6E73]">
                        {i.code} · {i.category}
                        {i.location ? ` · ${i.location}` : ""}
                        {i.holderAllocationId ? ` · ${props.nameByAllocationId[i.holderAllocationId] ?? ""}` : ""}
                        {i.status ? ` · ${i.status}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </RopCard>
      </div>
    </div>
  );
}

function LiveUpdate({
  update,
  canVote,
  pending,
  onVote,
}: {
  update: FwcCrisisUpdateView;
  canVote: boolean;
  pending: boolean;
  onVote: (key: string) => void;
}) {
  const t = useTranslations("fwcRop");
  const now = useNowMs(update.status === "qa");
  const qaLeft = update.qaEndsAt ? Math.max(0, Math.round((Date.parse(update.qaEndsAt) - now) / 1000)) : 0;
  return (
    <RopCard className="border border-[#FF9500]/40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C25E00]">
        {update.status === "qa" ? t("qaLive") : t("choosePathway")}
      </p>
      <h2 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-[#1D1D1F]">{update.title}</h2>
      {update.body ? <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#1D1D1F]">{update.body}</p> : null}
      {update.status === "qa" ? (
        <p className="mt-3 text-[13px] text-[#6E6E73]">
          {qaLeft > 0
            ? t("qaCountdown", { m: Math.floor(qaLeft / 60), s: String(qaLeft % 60).padStart(2, "0") })
            : t("qaOver")}
        </p>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {update.pathways.map((p) => {
          const mine = update.myVote === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={!canVote || update.status !== "choosing" || pending}
              onClick={() => onVote(p.key)}
              className={`rounded-[16px] border p-3 text-left transition-colors duration-200 disabled:cursor-default ${
                mine ? "border-[#007AFF] bg-[#E8F1FF]" : "border-[#D1D1D6] bg-white hover:bg-[#F2F2F7]"
              }`}
            >
              <span className="block text-[14px] font-semibold text-[#1D1D1F]">{p.label}</span>
              {p.description ? <span className="mt-0.5 block text-[12px] text-[#6E6E73]">{p.description}</span> : null}
              {mine ? <span className="mt-1 block text-[11px] font-semibold text-[#007AFF]">{t("yourVote")}</span> : null}
            </button>
          );
        })}
      </div>
    </RopCard>
  );
}

const DETAIL_FIELDS: RopMotionField[] = ["totalMinutes", "speakerSeconds", "topic", "target", "agendaTopic"];

function FloorPanel(props: {
  viewer: { allocationId: string } | null;
  phase: "debate" | "voting";
  motionRound: number;
  floor: FwcFloorRequestView[];
  pending: boolean;
  message: { tone: "ok" | "error"; text: string } | null;
  onRaise: (kind: "motion" | "point", code: string, details: Record<string, unknown>) => void;
  onRespond: (id: string, stance: "second" | "object" | "withdraw") => void;
}) {
  const t = useTranslations("fwcRop");
  const motions = FWC_ROP.motions.filter((m) => m.delegateRaisable && motionAllowedInPhase(m, props.phase));
  const [kind, setKind] = useState<"motion" | "point">("motion");
  const [code, setCode] = useState(motions[0]?.code ?? "");
  const [pointCode, setPointCode] = useState(FWC_ROP.points[0]?.code ?? "");
  const [details, setDetails] = useState<Record<string, string>>({});
  const motion = FWC_ROP.motions.find((m) => m.code === code);
  const parsed = {
    totalMinutes: details.totalMinutes ? Number(details.totalMinutes) : null,
    speakerSeconds: details.speakerSeconds ? Number(details.speakerSeconds) : null,
    topic: details.topic ?? null,
    target: details.target ?? null,
    agendaTopic: details.agendaTopic ?? null,
    note: details.note ?? undefined,
  };
  const missing = motion ? missingMotionFields(motion, parsed) : [];
  const mineThisRound = props.floor.some((r) => r.kind === "motion" && r.allocationId === props.viewer?.allocationId && r.motionRound === props.motionRound);
  const motionsOpen = props.floor.filter((r) => r.kind === "motion");
  const points = props.floor.filter((r) => r.kind === "point" && r.allocationId === props.viewer?.allocationId);

  return (
    <RopCard>
      <RopHeading hint={t("floorHint", { round: props.motionRound })}>{t("floor")}</RopHeading>
      <div className="mb-4 flex gap-2">
        {(["motion", "point"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-[980px] px-3.5 py-1.5 text-[13px] font-semibold ${kind === k ? "bg-[#1D1D1F] text-white" : "border border-[#D1D1D6] bg-white text-[#1D1D1F]"}`}
          >
            {k === "motion" ? t("raiseMotion") : t("raisePoint")}
          </button>
        ))}
      </div>
      {kind === "motion" ? (
        <div className="space-y-3">
          <select className={ropInputClass} value={code} onChange={(e) => { setCode(e.target.value); setDetails({}); }}>
            {motions.map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
                {m.majority === "2/3" ? ` · ${t("twoThirds")}` : ""}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            {DETAIL_FIELDS.filter((f) => motion?.requiredFields.includes(f)).map((f) => (
              <RopField key={f} label={t(`motionField.${f}`)} required>
                <input
                  className={ropInputClass}
                  inputMode={f === "totalMinutes" || f === "speakerSeconds" ? "numeric" : undefined}
                  value={details[f] ?? ""}
                  onChange={(e) => setDetails({ ...details, [f]: e.target.value })}
                />
              </RopField>
            ))}
          </div>
          <RopButton tone="primary" disabled={props.pending || !motion || missing.length > 0 || mineThisRound} onClick={() => props.onRaise("motion", code, parsed)}>
            {mineThisRound ? t("oneMotionPerRound") : t("raiseThisMotion")}
          </RopButton>
        </div>
      ) : (
        <div className="space-y-3">
          <select className={ropInputClass} value={pointCode} onChange={(e) => setPointCode(e.target.value)}>
            {FWC_ROP.points.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
                {p.viaNote ? ` · ${t("viaNote")}` : ""}
              </option>
            ))}
          </select>
          <textarea className={`${ropInputClass} min-h-[64px]`} value={details.note ?? ""} onChange={(e) => setDetails({ ...details, note: e.target.value })} placeholder={t("pointNotePlaceholder")} />
          <RopButton tone="primary" disabled={props.pending} onClick={() => props.onRaise("point", pointCode, { note: details.note ?? "" })}>
            {t("raiseThisPoint")}
          </RopButton>
        </div>
      )}
      {props.message ? (
        <div className="mt-3">
          <RopNotice tone={props.message.tone}>{props.message.text}</RopNotice>
        </div>
      ) : null}

      {motionsOpen.length ? (
        <div className="mt-5 border-t border-[#D1D1D6] pt-4">
          <h3 className="mb-2 text-[13px] font-semibold text-[#1D1D1F]">{t("motionsOnFloor")}</h3>
          <ul className="space-y-2">
            {motionsOpen.map((r) => {
              const own = r.allocationId === props.viewer?.allocationId;
              const seconded = r.seconds.includes(props.viewer?.allocationId ?? "");
              const objected = r.objections.includes(props.viewer?.allocationId ?? "");
              return (
                <li key={r.id} className="rounded-[12px] border border-[#D1D1D6] p-3 text-[13px]">
                  <p className="font-semibold text-[#1D1D1F]">{r.label}</p>
                  <p className="text-[12px] text-[#6E6E73]">
                    {r.name}
                    {typeof r.details.topic === "string" && r.details.topic ? ` · ${r.details.topic}` : ""}
                    {r.details.totalMinutes ? ` · ${String(r.details.totalMinutes)} min` : ""}
                    {" · "}
                    {t("secondsObjections", { s: r.seconds.length, o: r.objections.length })}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {own ? (
                      <RopButton tone="danger" disabled={props.pending} onClick={() => props.onRespond(r.id, "withdraw")}>
                        {t("withdraw")}
                      </RopButton>
                    ) : (
                      <>
                        <RopButton tone={seconded ? "primary" : "secondary"} disabled={props.pending} onClick={() => props.onRespond(r.id, "second")}>
                          {t("second")}
                        </RopButton>
                        <RopButton tone={objected ? "danger" : "secondary"} disabled={props.pending} onClick={() => props.onRespond(r.id, "object")}>
                          {t("object")}
                        </RopButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {points.length ? (
        <div className="mt-4">
          <h3 className="mb-2 text-[13px] font-semibold text-[#1D1D1F]">{t("yourPoints")}</h3>
          <ul className="space-y-1">
            {points.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-[13px] text-[#1D1D1F]">
                <span>{r.label}</span>
                <RopButton tone="ghost" disabled={props.pending} onClick={() => props.onRespond(r.id, "withdraw")}>
                  {t("withdraw")}
                </RopButton>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </RopCard>
  );
}
