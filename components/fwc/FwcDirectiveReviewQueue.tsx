// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  presentFwcDirectiveToFloor,
  publishFwcDirectiveOutcome,
  recallFwcDirective,
  recordFwcDirectiveFloorResult,
  reopenFwcDirective,
  reviewFwcDirective,
  type FwcWorkspaceDirective,
} from "@/app/actions/fwcDirectives";
import { FWC_ROP } from "@/lib/rop";
import { findDirectiveType, ROP_DIRECTIVE_DECIDED } from "@/lib/rop/directives";
import { findCharacter, findFrequency } from "@/lib/rop/crisis";
import {
  formatWhen,
  RopButton,
  RopCard,
  RopHeading,
  RopNotice,
  RopStatusPill,
  ropInputClass,
  useFwcRealtimeRefresh,
} from "@/components/fwc/rop-ui";

type Decision = "approved" | "approved_with_conditions" | "rejected" | "needs_revision";
const DECISIONS: Decision[] = ["approved", "approved_with_conditions", "needs_revision", "rejected"];
const OPEN = new Set(["awaiting_signatures", "pending", "on_floor"]);

export function FwcDirectiveReviewQueue(props: {
  conferenceId: string;
  canonicalConferenceId: string;
  voteConferenceId: string;
  directives: FwcWorkspaceDirective[];
  nameByAllocationId: Record<string, string>;
  countryByAllocationId: Record<string, string | null>;
}) {
  const t = useTranslations("fwcRop");
  useFwcRealtimeRefresh(props.canonicalConferenceId, ["fwc_directives", "fwc_directive_events"]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const types = FWC_ROP.directives!.types;

  const rows = useMemo(() => {
    const priority = (d: FwcWorkspaceDirective) => findDirectiveType(FWC_ROP, d.directive_type)?.queuePriority ?? 5;
    return props.directives
      .filter((d) => typeFilter === "all" || d.directive_type === typeFilter)
      .filter((d) =>
        statusFilter === "all" ? true : statusFilter === "open" ? OPEN.has(d.approval_status) : d.approval_status === statusFilter
      )
      .sort((a, b) => {
        const openA = OPEN.has(a.approval_status) ? 0 : 1;
        const openB = OPEN.has(b.approval_status) ? 0 : 1;
        if (openA !== openB) return openA - openB;
        if (priority(a) !== priority(b)) return priority(a) - priority(b);
        return (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at);
      });
  }, [props.directives, typeFilter, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of props.directives) if (OPEN.has(d.approval_status)) c[d.directive_type] = (c[d.directive_type] ?? 0) + 1;
    return c;
  }, [props.directives]);

  return (
    <RopCard>
      <RopHeading hint={t("queueHint")}>{t("directiveQueue")}</RopHeading>
      <div className="mb-4 flex flex-wrap gap-3">
        <select className={`${ropInputClass} w-auto`} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={t("filterType")}>
          <option value="all">{t("allTypes")}</option>
          {types.map((ty) => (
            <option key={ty.key} value={ty.key}>
              {ty.label}
              {counts[ty.key] ? ` (${counts[ty.key]})` : ""}
            </option>
          ))}
        </select>
        <select className={`${ropInputClass} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t("filterStatus")}>
          <option value="open">{t("openOnly")}</option>
          <option value="all">{t("allStatuses")}</option>
          {["awaiting_signatures", "pending", "on_floor", "approved", "approved_with_conditions", "needs_revision", "rejected", "withdrawn"].map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[#6E6E73]">{t("queueEmpty")}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((d) => (
            <ReviewCard key={d.id} d={d} {...props} />
          ))}
        </ul>
      )}
    </RopCard>
  );
}

function ReviewCard({
  d,
  conferenceId,
  voteConferenceId,
  nameByAllocationId,
  countryByAllocationId,
}: {
  d: FwcWorkspaceDirective;
  conferenceId: string;
  voteConferenceId: string;
  nameByAllocationId: Record<string, string>;
  countryByAllocationId: Record<string, string | null>;
}) {
  const t = useTranslations("fwcRop");
  const type = findDirectiveType(FWC_ROP, d.directive_type);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [response, setResponse] = useState("");
  const [outcome, setOutcome] = useState(d.public_outcome ?? "");
  const [publish, setPublish] = useState(Boolean(type?.publishOutcomeToFeed));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const name = (id: string | null) => (id ? (nameByAllocationId[id] ?? t("unknownSeat")) : t("unknownSeat"));
  const decided = ROP_DIRECTIVE_DECIDED.includes(d.approval_status);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setMessage(null);
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? { tone: "ok", text: ok } : { tone: "error", text: res.error ?? t("genericError") });
    });
  };

  const decisions = type?.floorVote ? DECISIONS.filter((x) => x === "needs_revision" || x === "rejected") : DECISIONS;

  return (
    <li className={`rounded-[16px] border p-4 ${d.directive_type === "rapid_crisis_action" && d.approval_status === "pending" ? "border-[#FF9500]" : "border-[#D1D1D6]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <RopStatusPill status={d.approval_status} label={t(`status.${d.approval_status}`)} />
        <span className="text-[12px] font-semibold text-[#1D1D1F]">{type?.label}</span>
        <span className="text-[12px] text-[#6E6E73]">
          {d.crisis_day ? t("dayN", { n: d.crisis_day }) : ""}
          {d.crisis_session ? ` · ${t("sessionN", { n: d.crisis_session })}` : ""}
          {d.submitted_at ? ` · ${formatWhen(d.submitted_at)}` : ""}
          {d.is_final ? ` · ${t("final")}` : ""}
          {d.cabinet_key ? ` · ${t("cabinetX", { x: d.cabinet_key })}` : ""}
        </span>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">{d.title}</h3>
      <p className="text-[12px] text-[#6E6E73]">
        {name(d.submitter_allocation_id)}
        {d.co_submitter_allocation_ids.length ? ` + ${d.co_submitter_allocation_ids.map(name).join(", ")}` : ""}
        {d.anonymity_status === "active" ? ` · ${t("anonymousToDelegates")}` : ""}
        {d.created_by_role === "smt_acting" ? ` · ${t("draftedBySecretariat")}` : ""}
      </p>
      <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">{t("fieldRequest")}</dt>
          <dd className="whitespace-pre-wrap text-[#1D1D1F]">{d.request_body}</dd>
        </div>
        {d.invoked_powers.length ? (
          <InvokedList
            label={t("fieldPower")}
            items={d.invoked_powers.map((ref) => {
              const power = findCharacter(FWC_ROP, countryByAllocationId[ref.allocation_id] ?? null)?.powers.find((p) => p.key === ref.key);
              const frequency = power ? findFrequency(FWC_ROP, power.frequency) : null;
              return {
                id: `${ref.allocation_id}:${ref.key}`,
                label: power?.label ?? ref.key,
                owner: name(ref.allocation_id),
                detail: [power?.summary, frequency?.label, power?.approvalNote].filter(Boolean).join(" · "),
              };
            })}
          />
        ) : null}
        {d.invoked_assets.length ? (
          <InvokedList
            label={t("fieldAssets")}
            items={d.invoked_assets.map((ref) => {
              const asset = findCharacter(FWC_ROP, countryByAllocationId[ref.allocation_id] ?? null)?.assets.find((a) => a.key === ref.key);
              return {
                id: `${ref.allocation_id}:${ref.key}`,
                label: asset?.label ?? ref.key,
                owner: name(ref.allocation_id),
                detail: asset ? t(`assetCategory.${asset.category}`) : "",
              };
            })}
          />
        ) : null}
        {[
          [t("fieldPower"), d.invoked_powers.length ? null : d.character_power],
          [t("fieldAssets"), d.invoked_assets.length ? null : d.assets],
          [t("fieldResource"), d.resource],
          [t("fieldReason"), d.reason],
          [t("fieldTargetGrid"), d.target_grid],
        ].map(([label, value]) =>
          value ? (
            <div key={label as string}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">{label}</dt>
              <dd className="whitespace-pre-wrap text-[#1D1D1F]">{value}</dd>
            </div>
          ) : null
        )}
      </dl>
      {d.signatures.length ? (
        <p className="mt-2 text-[12px] text-[#6E6E73]">
          {d.signatures.map((s) => `${name(s.allocation_id)} ${s.status === "signed" ? "✓" : s.status === "declined" ? "✕" : "…"}`).join(" · ")}
        </p>
      ) : null}
      {d.response_to_author ? (
        <p className="mt-2 rounded-[10px] bg-[#F2F2F7] px-3 py-2 text-[13px] text-[#1D1D1F]">
          <span className="font-semibold">{t("daisResponse")}:</span> {d.response_to_author}
        </p>
      ) : null}

      {d.approval_status === "pending" ? (
        <div className="mt-4 space-y-3 border-t border-[#D1D1D6] pt-4">
          <div className="flex flex-wrap gap-2">
            {decisions.map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={decision === x}
                onClick={() => setDecision(x)}
                className={`rounded-[980px] px-3 py-1.5 text-[12px] font-semibold transition-colors duration-200 ${
                  decision === x ? "bg-[#1D1D1F] text-white" : "border border-[#D1D1D6] bg-white text-[#1D1D1F] hover:bg-[#F2F2F7]"
                }`}
              >
                {t(`decision.${x}`)}
              </button>
            ))}
            {type?.floorVote ? (
              <RopButton
                tone="primary"
                disabled={pending}
                onClick={() => run(() => presentFwcDirectiveToFloor({ conferenceId, directiveId: d.id, voteConferenceId }), t("presentedToFloor"))}
              >
                {t("presentToFloor")}
              </RopButton>
            ) : null}
          </div>
          {decision ? (
            <>
              <textarea className={`${ropInputClass} min-h-[80px]`} value={response} onChange={(e) => setResponse(e.target.value)} placeholder={t("responsePlaceholder")} />
              <textarea className={`${ropInputClass} min-h-[56px]`} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={t("outcomePlaceholder")} />
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
                  {t("publishToFeed")}
                </label>
                <input className={`${ropInputClass} flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("internalNotePlaceholder")} />
              </div>
              <RopButton
                tone="primary"
                disabled={pending || !response.trim()}
                onClick={() =>
                  run(
                    () =>
                      reviewFwcDirective({
                        conferenceId,
                        directiveId: d.id,
                        decision,
                        responseToAuthor: response,
                        publicOutcome: outcome,
                        publish,
                        internalNote: note,
                      }),
                    t("responseSent")
                  )
                }
              >
                {t("sendDecision")}
              </RopButton>
            </>
          ) : null}
        </div>
      ) : null}

      {d.approval_status === "on_floor" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#D1D1D6] pt-4">
          <span className="text-[12px] text-[#6E6E73]">{t("onFloorHint")}</span>
          <RopButton onClick={() => run(() => recordFwcDirectiveFloorResult({ conferenceId, directiveId: d.id, passed: true }), t("recorded"))} disabled={pending}>
            {t("markPassed")}
          </RopButton>
          <RopButton tone="danger" onClick={() => run(() => recordFwcDirectiveFloorResult({ conferenceId, directiveId: d.id, passed: false }), t("recorded"))} disabled={pending}>
            {t("markFailed")}
          </RopButton>
        </div>
      ) : null}

      {decided ? (
        <div className="mt-4 space-y-2 border-t border-[#D1D1D6] pt-4">
          {d.published_at ? <p className="text-[12px] text-[#1B7F3B]">{t("publishedAt", { time: formatWhen(d.published_at) })}</p> : null}
          <textarea className={`${ropInputClass} min-h-[56px]`} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={t("outcomePlaceholder")} />
          <div className="flex flex-wrap gap-2">
            <RopButton tone="primary" disabled={pending || !outcome.trim()} onClick={() => run(() => publishFwcDirectiveOutcome({ conferenceId, directiveId: d.id, publicOutcome: outcome }), t("published"))}>
              {t("publishOutcome")}
            </RopButton>
            <RopButton disabled={pending} onClick={() => run(() => reopenFwcDirective({ conferenceId, directiveId: d.id }), t("reopened"))}>
              {t("reopen")}
            </RopButton>
          </div>
        </div>
      ) : null}

      {OPEN.has(d.approval_status) && d.approval_status !== "on_floor" ? (
        <div className="mt-3">
          <RopButton tone="ghost" disabled={pending} onClick={() => run(() => recallFwcDirective({ conferenceId, directiveId: d.id, mode: "withdraw" }), t("withdrawn"))}>
            {t("withdrawForAuthor")}
          </RopButton>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3">
          <RopNotice tone={message.tone}>{message.text}</RopNotice>
        </div>
      ) : null}

      {d.events.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-semibold text-[#007AFF]">{t("history")}</summary>
          <ol className="mt-1.5 space-y-1">
            {d.events.map((e) => (
              <li key={e.id} className="text-[12px] text-[#6E6E73]">
                {formatWhen(e.created_at)} · {t(`event.${e.action}`)} · {t(`actor.${e.actor_role ?? "system"}`)}
                {e.internal ? ` · ${t("internal")}` : ""}
                {e.note ? ` — ${e.note}` : ""}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </li>
  );
}

function InvokedList({ label, items }: { label: string; items: { id: string; label: string; owner: string; detail: string }[] }) {
  const owners = new Set(items.map((i) => i.owner));
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">{label}</dt>
      <dd className="mt-1">
        <ul className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <li
              key={i.id}
              title={i.detail || undefined}
              className="rounded-[980px] bg-[#E8F1FF] px-2.5 py-0.5 text-[12px] font-semibold text-[#0057B8]"
            >
              {i.label}
              {owners.size > 1 ? <span className="font-normal"> · {i.owner}</span> : null}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
