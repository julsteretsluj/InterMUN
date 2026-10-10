// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteFwcDirectiveDraft,
  recallFwcDirective,
  saveFwcDirectiveDraft,
  signFwcDirective,
  submitFwcDirectiveForReview,
  type FwcWorkspaceDirective,
} from "@/app/actions/fwcDirectives";
import { FWC_ROP } from "@/lib/rop";
import { describeDirectiveError, findDirectiveType, ROP_DIRECTIVE_EDITABLE, validateDirectiveForSubmit } from "@/lib/rop/directives";
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
import { FwcCitationPicker, type CitationPickerOption } from "@/components/fwc/FwcCitationPicker";
import {
  citationAuthors,
  citationId,
  directiveAssetOptions,
  directivePowerOptions,
  type CitationRef,
  type CrisisCounters,
  type PowerUse,
} from "@/lib/rop/crisis";

/** Everything the composer needs to list each character's citable powers/assets. */
export type FwcCitationContext = {
  countryByAllocationId: Record<string, string | null>;
  usesByAllocation: Record<string, Record<string, PowerUse[]>>;
  counters: CrisisCounters;
};

type Draft = {
  id: string | null;
  typeKey: string;
  title: string;
  request: string;
  powers: string[];
  assets: string[];
  resource: string;
  reason: string;
  targetGrid: string;
  anonymity: boolean;
  coAuthors: string[];
  isFinal: boolean;
};

const EMPTY: Draft = {
  id: null,
  typeKey: "personal",
  title: "",
  request: "",
  powers: [],
  assets: [],
  resource: "",
  reason: "",
  targetGrid: "",
  anonymity: false,
  coAuthors: [],
  isFinal: false,
};

function draftFrom(d: FwcWorkspaceDirective): Draft {
  return {
    id: d.id,
    typeKey: d.directive_type,
    title: d.title,
    request: d.request_body,
    powers: d.invoked_powers.map((r) => citationId({ allocationId: r.allocation_id, key: r.key })),
    assets: d.invoked_assets.map((r) => citationId({ allocationId: r.allocation_id, key: r.key })),
    resource: d.resource ?? "",
    reason: d.reason ?? "",
    targetGrid: d.target_grid ?? "",
    anonymity: d.anonymity_status === "active",
    coAuthors: d.co_submitter_allocation_ids,
    isFinal: d.is_final,
  };
}

export function FwcDirectiveWorkspace(props: {
  conferenceId: string;
  canonicalConferenceId: string;
  actingAllocationId: string | null;
  viewer: {
    allocationId: string;
    displayName: string;
    anonymityEligible: boolean;
  } | null;
  citations: FwcCitationContext;
  coAuthorOptions: { id: string; label: string }[];
  directives: FwcWorkspaceDirective[];
  nameByAllocationId: Record<string, string>;
  activeCrisis: boolean;
  blockedByStatus: string | null;
  anonymityUsedThisSession: boolean;
}) {
  const t = useTranslations("fwcRop");
  useFwcRealtimeRefresh(props.canonicalConferenceId, ["fwc_directives", "fwc_directive_events"], ["fwc_directive_signatures"]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const types = FWC_ROP.directives!.types;
  const type = findDirectiveType(FWC_ROP, draft.typeKey) ?? types[0]!;
  const nameOf = (id: string | null) => (id ? (props.nameByAllocationId[id] ?? t("unknownSeat")) : t("anonymous"));
  const acting = props.actingAllocationId;

  const citationOptions = useMemo(() => {
    const submitterId = props.viewer?.allocationId;
    if (!submitterId)
      return {
        powers: [],
        unavailable: [],
        assets: [],
        refs: new Map<string, CitationRef>(),
      };
    const author = (id: string) => ({
      allocationId: id,
      country: props.citations.countryByAllocationId[id] ?? null,
    });
    const authors = citationAuthors(type, author(submitterId), draft.coAuthors.map(author));
    const pooled = authors.length > 1;
    const owner = (id: string) => props.nameByAllocationId[id] ?? t("unknownSeat");
    const refs = new Map<string, CitationRef>();
    const powers: CitationPickerOption[] = [];
    const unavailable: { id: string; label: string; reason: string }[] = [];
    for (const p of directivePowerOptions(FWC_ROP, type.key, authors, props.citations.usesByAllocation, props.citations.counters)) {
      const id = citationId(p);
      const label = pooled ? `${p.label} (${owner(p.allocationId)})` : p.label;
      if (!p.available) {
        unavailable.push({ id, label, reason: p.reason ?? "" });
        continue;
      }
      refs.set(id, { allocationId: p.allocationId, key: p.key });
      powers.push({
        id,
        label: p.label,
        description: p.summary,
        meta: [p.frequencyLabel, p.remaining != null ? t("usesLeft", { n: p.remaining }) : null, p.approvalNote].filter(Boolean).join(" · "),
        group: pooled ? owner(p.allocationId) : null,
      });
    }
    const assets: CitationPickerOption[] = directiveAssetOptions(FWC_ROP, authors).map((a) => {
      const id = citationId(a);
      refs.set(id, { allocationId: a.allocationId, key: a.key });
      return {
        id,
        label: a.label,
        description: pooled ? t(`assetCategory.${a.category}`) : null,
        group: pooled ? owner(a.allocationId) : t(`assetCategory.${a.category}`),
      };
    });
    return { powers, unavailable, assets, refs };
  }, [props.viewer?.allocationId, props.citations, props.nameByAllocationId, type, draft.coAuthors, t]);
  const pickedPowers = draft.powers.filter((id) => citationOptions.refs.has(id));
  const pickedAssets = draft.assets.filter((id) => citationOptions.refs.has(id));
  const labelsOf = (ids: string[], options: CitationPickerOption[]) =>
    ids
      .map((id) => options.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(" · ");

  const mine = props.directives.filter((d) => d.isMine);
  const toSign = props.directives.filter(
    (d) =>
      d.isCoAuthor &&
      (d.approval_status === "awaiting_signatures" || d.approval_status === "draft") &&
      d.signatures.some((s) => s.allocation_id === props.viewer?.allocationId && s.status === "pending"),
  );
  const coAuthored = props.directives.filter((d) => d.isCoAuthor && !toSign.includes(d));
  const committee = props.directives.filter((d) => !d.isMine && !d.isCoAuthor);

  const clientErrors = validateDirectiveForSubmit(FWC_ROP, {
    typeKey: draft.typeKey,
    fields: {
      title: draft.title,
      request: draft.request,
      characterPower: labelsOf(pickedPowers, citationOptions.powers),
      assets: labelsOf(pickedAssets, citationOptions.assets),
      resource: draft.resource,
      reason: draft.reason,
      targetGrid: draft.targetGrid,
    },
    authorCount: 1 + draft.coAuthors.length,
    anonymity: draft.anonymity,
    anonymityUsesThisSession: props.anonymityUsedThisSession ? 1 : 0,
  });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, after?: () => void) => {
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setMessage({ tone: "error", text: res.error ?? t("genericError") });
      else {
        setMessage({ tone: "ok", text: okText });
        after?.();
      }
    });
  };

  const save = async () => {
    const res = await saveFwcDirectiveDraft({
      conferenceId: props.conferenceId,
      actingAllocationId: acting,
      directiveId: draft.id,
      typeKey: draft.typeKey,
      title: draft.title,
      request: draft.request,
      invokedPowers: pickedPowers.map((id) => citationOptions.refs.get(id)!),
      invokedAssets: pickedAssets.map((id) => citationOptions.refs.get(id)!),
      resource: draft.resource,
      reason: draft.reason,
      targetGrid: draft.targetGrid,
      anonymity: draft.anonymity,
      coAuthorAllocationIds: draft.coAuthors,
      isFinal: draft.isFinal,
    });
    if (res.ok) setDraft((d) => ({ ...d, id: res.data.directiveId }));
    return res;
  };

  const saveAndSubmit = async () => {
    const saved = await save();
    if (!saved.ok) return saved;
    const res = await submitFwcDirectiveForReview({
      conferenceId: props.conferenceId,
      directiveId: saved.data.directiveId,
      actingAllocationId: acting,
    });
    if (res.ok) setDraft(EMPTY);
    return res;
  };

  const authorRange =
    type.maxAuthors === 1
      ? null
      : type.maxAuthors == null
        ? t("authorsAtLeast", { min: type.minAuthors })
        : t("authorsRange", { min: type.minAuthors, max: type.maxAuthors });

  if (!props.viewer) {
    return <RopNotice>{t("needSeat")}</RopNotice>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <RopCard>
          <RopHeading hint={type.summary}>{draft.id ? t("editDirective") : t("newDirective")}</RopHeading>
          {props.blockedByStatus ? (
            <div className="mb-4">
              <RopNotice tone="error">{t("blockedByStatus", { status: props.blockedByStatus })}</RopNotice>
            </div>
          ) : null}
          <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label={t("directiveType")}>
            {types.map((ty) => {
              const active = ty.key === draft.typeKey;
              const locked = ty.submitWindow === "active_crisis" && !props.activeCrisis;
              return (
                <button
                  key={ty.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={Boolean(draft.id) && !active}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      typeKey: ty.key,
                      anonymity: ty.anonymityAllowed ? d.anonymity : false,
                      coAuthors: ty.maxAuthors === 1 ? [] : d.coAuthors,
                      isFinal: false,
                    }))
                  }
                  className={`rounded-[980px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200 disabled:opacity-40 ${
                    active ? "bg-[#1D1D1F] text-white" : "border border-[#D1D1D6] bg-white text-[#1D1D1F] hover:bg-[#F2F2F7]"
                  }`}
                  title={locked ? t("rapidLocked") : ty.summary}
                >
                  {ty.label}
                  {locked ? ` · ${t("lockedSuffix")}` : ""}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4">
            <RopField label={t("fieldTitle")} required>
              <input
                className={ropInputClass}
                value={draft.title}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={t("titlePlaceholder")}
              />
            </RopField>
            <RopField
              label={t("fieldRequest")}
              required
              hint={t("charsLeft", {
                n: type.maxRequestChars - draft.request.length,
              })}
            >
              <textarea
                className={`${ropInputClass} min-h-[132px]`}
                value={draft.request}
                onChange={(e) => setDraft({ ...draft, request: e.target.value })}
                placeholder={t("requestPlaceholder")}
              />
            </RopField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FwcCitationPicker
                label={t("fieldPower")}
                required={type.requiredFields.includes("characterPower")}
                placeholder={t("choosePowers")}
                emptyLabel={t("noPowersOnCharacter")}
                options={citationOptions.powers}
                unavailable={citationOptions.unavailable}
                selected={pickedPowers}
                onChange={(ids) => setDraft({ ...draft, powers: ids })}
              />
              <RopField label={t("fieldTargetGrid")} hint={t("targetGridHint")}>
                <input
                  className={ropInputClass}
                  value={draft.targetGrid}
                  maxLength={12}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      targetGrid: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="E6"
                />
              </RopField>
            </div>
            <FwcCitationPicker
              label={t("fieldAssets")}
              required={type.requiredFields.includes("assets")}
              placeholder={t("chooseAssets")}
              emptyLabel={t("noAssetsOnCharacter")}
              options={citationOptions.assets}
              selected={pickedAssets}
              onChange={(ids) => setDraft({ ...draft, assets: ids })}
            />
            <RopField label={t("fieldResource")} required={type.requiredFields.includes("resource")}>
              <input
                className={ropInputClass}
                value={draft.resource}
                onChange={(e) => setDraft({ ...draft, resource: e.target.value })}
                placeholder={t("resourcePlaceholder")}
              />
            </RopField>
            <RopField label={t("fieldReason")} required={type.requiredFields.includes("reason")}>
              <textarea
                className={`${ropInputClass} min-h-[72px]`}
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                placeholder={t("reasonPlaceholder")}
              />
            </RopField>

            {type.maxAuthors !== 1 ? (
              <fieldset className="space-y-2">
                <legend className="text-[13px] font-semibold text-[#1D1D1F]">
                  {t(`coAuthorNoun.${type.coAuthorNoun}`)} <span className="font-normal text-[#6E6E73]">· {authorRange}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {props.coAuthorOptions.map((o) => {
                    const on = draft.coAuthors.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            coAuthors: on ? draft.coAuthors.filter((x) => x !== o.id) : [...draft.coAuthors, o.id],
                          })
                        }
                        className={`rounded-[980px] px-3 py-1 text-[12px] font-semibold transition-colors duration-200 ${
                          on ? "bg-[#007AFF] text-white" : "border border-[#D1D1D6] bg-white text-[#1D1D1F] hover:bg-[#F2F2F7]"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                {type.coAuthorsMustSign ? <p className="text-[12px] text-[#6E6E73]">{t("mustSignHint")}</p> : null}
              </fieldset>
            ) : null}

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {type.anonymityAllowed && props.viewer.anonymityEligible ? (
                <label className="inline-flex items-center gap-2 text-[13px] text-[#1D1D1F]">
                  <input type="checkbox" checked={draft.anonymity} onChange={(e) => setDraft({ ...draft, anonymity: e.target.checked })} />
                  {t("anonymityToggle")}
                  <span className="text-[#6E6E73]">{props.anonymityUsedThisSession ? t("anonymityUsed") : t("anonymityLeft")}</span>
                </label>
              ) : !type.anonymityAllowed ? (
                <span className="text-[12px] text-[#6E6E73]">{t("anonymityNotAllowed")}</span>
              ) : null}
              {FWC_ROP.directives?.finalDirective?.typeKey === type.key ? (
                <label className="inline-flex items-center gap-2 text-[13px] text-[#1D1D1F]">
                  <input type="checkbox" checked={draft.isFinal} onChange={(e) => setDraft({ ...draft, isFinal: e.target.checked })} />
                  {t("finalToggle")}
                </label>
              ) : null}
            </div>

            {clientErrors.length > 0 && (draft.title || draft.request) ? (
              <ul className="space-y-1 text-[12px] text-[#8A4B00]">
                {clientErrors.map((e, i) => (
                  <li key={i}>{describeDirectiveError(e, type)}</li>
                ))}
              </ul>
            ) : null}
            {message ? <RopNotice tone={message.tone}>{message.text}</RopNotice> : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <RopButton
                tone="primary"
                disabled={pending || clientErrors.length > 0 || Boolean(props.blockedByStatus)}
                onClick={() => run(saveAndSubmit, type.coAuthorsMustSign && draft.coAuthors.length ? t("sentForSignatures") : t("submitted"))}
              >
                {type.coAuthorsMustSign && draft.coAuthors.length ? t("sendForSignatures") : t("submitToDais")}
              </RopButton>
              <RopButton disabled={pending || !draft.title.trim()} onClick={() => run(save, t("draftSaved"))}>
                {t("saveDraft")}
              </RopButton>
              {draft.id ? (
                <RopButton tone="ghost" onClick={() => setDraft(EMPTY)}>
                  {t("startNew")}
                </RopButton>
              ) : null}
            </div>
          </div>
        </RopCard>
      </div>

      <div className="space-y-6">
        {toSign.length > 0 ? (
          <RopCard>
            <RopHeading hint={t("toSignHint")}>{t("toSign")}</RopHeading>
            <ul className="space-y-3">
              {toSign.map((d) => (
                <li key={d.id} className="rounded-[12px] border border-[#D1D1D6] p-3">
                  <p className="text-[14px] font-semibold text-[#1D1D1F]">{d.title}</p>
                  <p className="mt-1 text-[12px] text-[#6E6E73]">
                    {findDirectiveType(FWC_ROP, d.directive_type)?.label} · {t("from", { name: nameOf(d.submitter_allocation_id) })}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#1D1D1F]">{d.request_body}</p>
                  <div className="mt-3 flex gap-2">
                    <RopButton
                      tone="primary"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            signFwcDirective({
                              conferenceId: props.conferenceId,
                              directiveId: d.id,
                              decision: "signed",
                              actingAllocationId: acting,
                            }),
                          t("signed"),
                        )
                      }
                    >
                      {t("sign")}
                    </RopButton>
                    <RopButton
                      tone="danger"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            signFwcDirective({
                              conferenceId: props.conferenceId,
                              directiveId: d.id,
                              decision: "declined",
                              actingAllocationId: acting,
                            }),
                          t("declined"),
                        )
                      }
                    >
                      {t("decline")}
                    </RopButton>
                  </div>
                </li>
              ))}
            </ul>
          </RopCard>
        ) : null}

        <RopCard>
          <RopHeading hint={t("yourDirectivesHint")}>{t("yourDirectives")}</RopHeading>
          {mine.length === 0 && coAuthored.length === 0 ? (
            <p className="text-[13px] text-[#6E6E73]">{t("noDirectivesYet")}</p>
          ) : (
            <ul className="space-y-3">
              {[...mine, ...coAuthored].reverse().map((d) => (
                <DirectiveCard
                  key={d.id}
                  d={d}
                  nameOf={nameOf}
                  pending={pending}
                  onEdit={() => setDraft(draftFrom(d))}
                  onSubmit={() =>
                    run(
                      () =>
                        submitFwcDirectiveForReview({
                          conferenceId: props.conferenceId,
                          directiveId: d.id,
                          actingAllocationId: acting,
                        }),
                      t("submitted"),
                    )
                  }
                  onRecall={() =>
                    run(
                      () =>
                        recallFwcDirective({
                          conferenceId: props.conferenceId,
                          directiveId: d.id,
                          mode: "recall",
                          actingAllocationId: acting,
                        }),
                      t("recalled"),
                    )
                  }
                  onWithdraw={() =>
                    run(
                      () =>
                        recallFwcDirective({
                          conferenceId: props.conferenceId,
                          directiveId: d.id,
                          mode: "withdraw",
                          actingAllocationId: acting,
                        }),
                      t("withdrawn"),
                    )
                  }
                  onDelete={() =>
                    run(
                      () =>
                        deleteFwcDirectiveDraft({
                          conferenceId: props.conferenceId,
                          directiveId: d.id,
                          actingAllocationId: acting,
                        }),
                      t("deleted"),
                      () => draft.id === d.id && setDraft(EMPTY),
                    )
                  }
                />
              ))}
            </ul>
          )}
        </RopCard>

        {committee.length > 0 ? (
          <RopCard>
            <RopHeading hint={t("committeeDirectivesHint")}>{t("committeeDirectives")}</RopHeading>
            <ul className="space-y-3">
              {committee.reverse().map((d) => (
                <DirectiveCard key={d.id} d={d} nameOf={nameOf} pending={pending} />
              ))}
            </ul>
          </RopCard>
        ) : null}
      </div>
    </div>
  );
}

function DirectiveCard({
  d,
  nameOf,
  pending,
  onEdit,
  onSubmit,
  onRecall,
  onWithdraw,
  onDelete,
}: {
  d: FwcWorkspaceDirective;
  nameOf: (id: string | null) => string;
  pending: boolean;
  onEdit?: () => void;
  onSubmit?: () => void;
  onRecall?: () => void;
  onWithdraw?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("fwcRop");
  const type = findDirectiveType(FWC_ROP, d.directive_type);
  const editable = d.isMine && ROP_DIRECTIVE_EDITABLE.includes(d.approval_status);
  const canRecall = d.isMine && (d.approval_status === "awaiting_signatures" || d.approval_status === "pending");
  const canWithdraw = d.isMine && !["draft", "withdrawn", "on_floor", "approved", "approved_with_conditions", "rejected"].includes(d.approval_status);
  return (
    <li className="rounded-[12px] border border-[#D1D1D6] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <RopStatusPill status={d.approval_status} label={t(`status.${d.approval_status}`)} />
        <span className="text-[12px] text-[#6E6E73]">
          {type?.label}
          {d.crisis_day ? ` · ${t("dayN", { n: d.crisis_day })}` : ""}
          {d.is_final ? ` · ${t("final")}` : ""}
          {d.anonymity_status === "active" ? ` · ${t("anonymous")}` : ""}
        </span>
      </div>
      <p className="mt-1.5 text-[14px] font-semibold text-[#1D1D1F]">{d.title}</p>
      {!d.isMine ? <p className="text-[12px] text-[#6E6E73]">{t("from", { name: nameOf(d.submitter_allocation_id) })}</p> : null}
      {d.signatures.length > 0 ? (
        <p className="mt-1 text-[12px] text-[#6E6E73]">
          {d.signatures.map((s) => `${nameOf(s.allocation_id)} ${s.status === "signed" ? "✓" : s.status === "declined" ? "✕" : "…"}`).join(" · ")}
        </p>
      ) : null}
      {d.response_to_author ? (
        <div className="mt-2 rounded-[10px] bg-[#F2F2F7] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">{t("daisResponse")}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-[#1D1D1F]">{d.response_to_author}</p>
        </div>
      ) : null}
      {d.public_outcome ? (
        <p className="mt-2 text-[12px] text-[#1D1D1F]">
          <span className="font-semibold">{t("publicOutcome")}:</span> {d.public_outcome}
        </p>
      ) : null}
      {d.events.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-[#007AFF]">{t("history")}</summary>
          <ol className="mt-1.5 space-y-1">
            {d.events.map((e) => (
              <li key={e.id} className="text-[12px] text-[#6E6E73]">
                {formatWhen(e.created_at)} · {t(`event.${e.action}`)}
                {e.actor_role === "smt_acting" ? ` (${t("bySecretariat")})` : ""}
                {e.note ? ` — ${e.note}` : ""}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {onEdit && (editable || canRecall || canWithdraw) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {editable ? (
            <RopButton onClick={onEdit} disabled={pending}>
              {t("edit")}
            </RopButton>
          ) : null}
          {editable ? (
            <RopButton tone="primary" onClick={onSubmit} disabled={pending}>
              {d.approval_status === "needs_revision" ? t("resubmit") : t("submitToDais")}
            </RopButton>
          ) : null}
          {canRecall ? (
            <RopButton onClick={onRecall} disabled={pending}>
              {t("recall")}
            </RopButton>
          ) : null}
          {canWithdraw ? (
            <RopButton tone="danger" onClick={onWithdraw} disabled={pending}>
              {t("withdraw")}
            </RopButton>
          ) : null}
          {d.approval_status === "draft" ? (
            <RopButton tone="danger" onClick={onDelete} disabled={pending}>
              {t("deleteDraft")}
            </RopButton>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
