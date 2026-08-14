// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { QueryTabs } from "@/components/ui/Tabs";
import { CheckCircle2, FileCheck, Lock, Plus, Trash2, Users } from "lucide-react";
import {
  addClauseAction,
  deleteClauseAction,
  finalizeResolutionAction,
  joinBlocAction,
  setCommitteeBlocsAction,
  setResolutionDocLinkAction,
  updateClauseAction,
  updateResolutionSponsorsAction,
  type ResolutionSponsorRole,
} from "@/app/actions/resolutions";
import {
  MIN_RESOLUTION_CO_SUBMITTERS,
  MIN_RESOLUTION_MAIN_SUBMITTERS,
  minResolutionSignatories,
} from "@/lib/resolution-functions";
import type { ScorableDelegateRow } from "@/lib/seated-delegates-for-awards";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import {
  DelegateResolutionBuilder,
  type ResolutionPick,
} from "@/components/resolutions/DelegateResolutionBuilder";

type BlocStance = "for" | "against" | "neutral";

interface Resolution {
  id: string;
  conference_id: string;
  google_docs_url: string | null;
  main_submitters: string[];
  co_submitters: string[];
  signatories: string[];
  visible_to_other_bloc: boolean;
  status?: string | null;
  finalized_at?: string | null;
}

interface Bloc {
  id: string;
  resolution_id: string;
  name: string;
  stance: string;
  bloc_memberships?: { user_id: string }[];
}

interface Clause {
  id: string;
  resolution_id: string;
  clause_number: number;
  clause_text: string;
  updated_at: string;
}

interface BlocDraft {
  id?: string;
  name: string;
  stance: BlocStance;
}

const STANCES: BlocStance[] = ["for", "against", "neutral"];

export function ResolutionsView({
  resolutions,
  blocs,
  clauses,
  conferenceId,
  canCreate,
  currentUserId,
  delegates = [],
}: {
  resolutions: Resolution[];
  blocs: Bloc[];
  clauses: Clause[];
  conferenceId: string;
  canCreate: boolean;
  currentUserId: string;
  delegates?: ScorableDelegateRow[];
}) {
  const t = useTranslations("resolutions");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // --- Chair bloc configuration ---
  const [blocDrafts, setBlocDrafts] = useState<BlocDraft[]>(() =>
    blocs.map((b) => ({
      id: b.id,
      name: b.name,
      stance: (STANCES.includes(b.stance as BlocStance) ? b.stance : "for") as BlocStance,
    }))
  );
  const [blocsStatus, setBlocsStatus] = useState<string | null>(null);

  // --- Per-resolution transient UI state ---
  const [docLinkDrafts, setDocLinkDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(resolutions.map((r) => [r.id, r.google_docs_url ?? ""]))
  );
  const [docLinkStatus, setDocLinkStatus] = useState<Record<string, string>>({});
  const [finalizeError, setFinalizeError] = useState<Record<string, string>>({});
  const [newClause, setNewClause] = useState<Record<string, string>>({});
  const [editingClause, setEditingClause] = useState<Record<string, string>>({});
  const [sponsorPick, setSponsorPick] = useState<Record<string, string>>({});

  const stanceLabel = (stance: string) => {
    switch (stance) {
      case "for":
        return t("stanceFor");
      case "against":
        return t("stanceAgainst");
      case "neutral":
        return t("stanceNeutral");
      default:
        return stance;
    }
  };

  function saveBlocs() {
    setActionError(null);
    setBlocsStatus(null);
    const payload = blocDrafts
      .map((b) => ({ id: b.id, name: b.name.trim(), stance: b.stance }))
      .filter((b) => b.name.length > 0);
    startTransition(async () => {
      const result = await setCommitteeBlocsAction({ conferenceId, blocs: payload });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setBlocsStatus(t("blocsSaved"));
      location.reload();
    });
  }

  function joinBloc(resolutionId: string, blocId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await joinBlocAction({ resolutionId, blocId });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      location.reload();
    });
  }

  function saveDocLink(resolutionId: string) {
    setActionError(null);
    setDocLinkStatus((s) => ({ ...s, [resolutionId]: "" }));
    const url = (docLinkDrafts[resolutionId] ?? "").trim();
    startTransition(async () => {
      const result = await setResolutionDocLinkAction({ resolutionId, url });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setDocLinkStatus((s) => ({ ...s, [resolutionId]: t("docLinkSaved") }));
      location.reload();
    });
  }

  function finalize(resolutionId: string) {
    setActionError(null);
    setFinalizeError((s) => ({ ...s, [resolutionId]: "" }));
    startTransition(async () => {
      const result = await finalizeResolutionAction({ resolutionId });
      if (!result.ok) {
        setFinalizeError((s) => ({ ...s, [resolutionId]: result.error }));
        return;
      }
      location.reload();
    });
  }

  function addClause(resolutionId: string) {
    if (!canCreate) return;
    const text = (newClause[resolutionId] ?? "").trim();
    if (!text) return;
    setActionError(null);
    startTransition(async () => {
      const result = await addClauseAction({ conferenceId, resolutionId, clauseText: text });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setNewClause((prev) => ({ ...prev, [resolutionId]: "" }));
      location.reload();
    });
  }

  function saveClause(clauseId: string) {
    if (!canCreate) return;
    const text = (editingClause[clauseId] ?? "").trim();
    if (!text) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateClauseAction({ clauseId, clauseText: text });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      location.reload();
    });
  }

  function delegateLabel(userId: string): string {
    const row = delegates.find((d) => d.userId === userId);
    if (!row) return userId.slice(0, 8);
    const name = row.displayName.trim();
    return name && name !== row.country ? `${row.country} — ${name}` : row.country;
  }

  function updateSponsor(resolutionId: string, role: ResolutionSponsorRole, action: "add" | "remove", userId: string) {
    if (!userId) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateResolutionSponsorsAction({ resolutionId, role, action, userId });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (action === "add") {
        setSponsorPick((prev) => {
          const next = { ...prev };
          delete next[`${resolutionId}:${role}`];
          return next;
        });
      }
      location.reload();
    });
  }

  function deleteClause(clauseId: string) {
    if (!canCreate) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteClauseAction({ clauseId });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      location.reload();
    });
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/25";

  const draftResolutionPicks: ResolutionPick[] = resolutions
    .filter((r) => (r.status ?? "draft") !== "finalized")
    .map((r) => ({
      id: r.id,
      conference_id: r.conference_id,
      google_docs_url: r.google_docs_url,
    }));

  const blocTabs = useMemo(
    () =>
      resolutions.map((r) => {
        const bloc = blocs.find((b) => b.resolution_id === r.id);
        const name = bloc?.name?.trim() || t("blocFallback");
        const isFinalized = (r.status ?? "draft") === "finalized";
        return {
          id: r.id,
          label: isFinalized ? `${name} · ${t("finalizedBadge")}` : name,
        };
      }),
    [resolutions, blocs, t]
  );

  const defaultBlocId = useMemo(() => {
    const joined = resolutions.find((r) => {
      const bloc = blocs.find((b) => b.resolution_id === r.id);
      return bloc?.bloc_memberships?.some((m) => m.user_id === currentUserId);
    });
    return joined?.id ?? resolutions[0]?.id;
  }, [resolutions, blocs, currentUserId]);

  return (
    <div className="space-y-4">
      <DelegateResolutionBuilder
        resolutions={draftResolutionPicks}
        conferenceId={conferenceId}
        canMergeToOfficial={canCreate}
      />

      {/* Chair bloc configuration */}
      {canCreate ? (
        <div className="dashboard-panel space-y-3 rounded-xl p-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-brand-navy">{t("blocsConfigTitle")}</h2>
            <p className="text-sm text-brand-muted">{t("blocsConfigHelp")}</p>
          </div>
          <div className="space-y-2">
            {blocDrafts.map((b, idx) => (
              <div key={b.id ?? `new-${idx}`} className="flex flex-wrap items-center gap-2">
                <input
                  value={b.name}
                  onChange={(e) =>
                    setBlocDrafts((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x))
                    )
                  }
                  placeholder={t("blocNamePlaceholder")}
                  className={`${inputCls} min-w-[160px] flex-1`}
                />
                <select
                  value={b.stance}
                  onChange={(e) =>
                    setBlocDrafts((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, stance: e.target.value as BlocStance } : x
                      )
                    )
                  }
                  className="rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] px-3 py-2 text-sm text-brand-navy focus:border-brand-accent/50 focus:outline-none"
                >
                  {STANCES.map((s) => (
                    <option key={s} value={s}>
                      {stanceLabel(s)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setBlocDrafts((prev) => prev.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("removeBloc")}
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBlocDrafts((prev) => [...prev, { name: "", stance: "for" }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              {t("addBloc")}
            </button>
            <button
              type="button"
              onClick={saveBlocs}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {t("saveBlocs")}
            </button>
            {blocsStatus ? <span className="text-xs text-brand-diplomatic">{blocsStatus}</span> : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-brand-muted">{t("chooseBlocHelp")}</p>
      )}

      {actionError ? (
        <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {actionError}
        </p>
      ) : null}

      {resolutions.length === 0 ? (
        <p className="text-sm text-brand-muted">{t("noBlocsYet")}</p>
      ) : (
      <QueryTabs
        options={blocTabs}
        tabKey="bloc"
        fallbackId={defaultBlocId}
        ariaLabel={t("blocTabsAria")}
        renderPanel={(activeId) => {
          const r = resolutions.find((row) => row.id === activeId);
          if (!r) return null;
          const bloc = blocs.find((b) => b.resolution_id === r.id) ?? null;
          const members = bloc?.bloc_memberships ?? [];
          const isMember = members.some((m) => m.user_id === currentUserId);
          const isFinalized = (r.status ?? "draft") === "finalized";
          const resolutionClauses = clauses
            .filter((c) => c.resolution_id === r.id)
            .sort((a, b) => a.clause_number - b.clause_number);
          const hasDocLink = Boolean(r.google_docs_url?.trim());

          return (
            <div className="dashboard-panel space-y-3 rounded-xl p-4">
              {/* Header: bloc identity + status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Users className="h-4 w-4 text-brand-muted" />
                  <span className="text-base font-semibold text-brand-navy">
                    {bloc ? bloc.name : t("blocFallback")}
                  </span>
                  {bloc ? (
                    <span className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-xs font-medium text-brand-navy dark:text-brand-accent-bright">
                      {stanceLabel(bloc.stance)}
                    </span>
                  ) : null}
                  <span className="text-xs text-brand-muted">
                    {t("membersCount", { count: members.length })}
                  </span>
                </div>
                {isFinalized ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/15 px-2.5 py-0.5 text-xs font-medium text-brand-diplomatic dark:text-brand-accent-bright">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("finalizedBadge")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted/10 px-2.5 py-0.5 text-xs font-medium text-brand-muted">
                    {t("draftBadge")}
                  </span>
                )}
              </div>

              {/* Delegate: join this bloc */}
              {!canCreate && !isMember && !isFinalized ? (
                <button
                  type="button"
                  onClick={() => joinBloc(r.id, bloc?.id ?? "")}
                  disabled={!bloc || pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-white/5 disabled:opacity-60"
                >
                  {t("joinThisBloc")}
                </button>
              ) : null}

              {(() => {
                const mainIds = (r.main_submitters ?? []).filter(Boolean);
                const coIds = (r.co_submitters ?? []).filter(Boolean);
                const signIds = (r.signatories ?? []).filter(Boolean);
                const listed = new Set([...mainIds, ...coIds, ...signIds]);
                const canEditSponsors = (canCreate || isMember) && !isFinalized;
                const minSign = minResolutionSignatories(delegates.length);
                const available = delegates.filter((d) => !listed.has(d.userId));
                const onThisDraft = listed.has(currentUserId);
                const columns: {
                  role: ResolutionSponsorRole;
                  title: string;
                  hint: string;
                  ids: string[];
                  required: number;
                }[] = [
                  {
                    role: "main",
                    title: t("mainSubmitters"),
                    hint: t("mainRequired", { count: MIN_RESOLUTION_MAIN_SUBMITTERS }),
                    ids: mainIds,
                    required: MIN_RESOLUTION_MAIN_SUBMITTERS,
                  },
                  {
                    role: "co",
                    title: t("coSubmitters"),
                    hint: t("coRequired", { count: MIN_RESOLUTION_CO_SUBMITTERS }),
                    ids: coIds,
                    required: MIN_RESOLUTION_CO_SUBMITTERS,
                  },
                  {
                    role: "signatory",
                    title: t("signatories"),
                    hint: t("signatoriesRequired", { count: minSign }),
                    ids: signIds,
                    required: minSign,
                  },
                ];
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                      {t("sponsorsTitle")}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {columns.map((col) => {
                        const pickKey = `${r.id}:${col.role}`;
                        const slotCount = Math.max(col.required, col.ids.length);
                        return (
                          <div
                            key={col.role}
                            className="space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-brand-navy">{col.title}</p>
                              <p className="text-xs text-brand-muted">
                                {col.ids.length}/{col.required} · {col.hint}
                              </p>
                            </div>
                            <ul className="space-y-1.5">
                              {Array.from({ length: slotCount }, (_, i) => {
                                const userId = col.ids[i];
                                if (!userId) {
                                  return (
                                    <li
                                      key={`open-${col.role}-${i}`}
                                      className="rounded-md border border-dashed border-[var(--hairline)] px-2 py-1.5 text-xs text-brand-muted"
                                    >
                                      {t("emptySlot")}
                                    </li>
                                  );
                                }
                                return (
                                  <li
                                    key={userId}
                                    className="flex items-start justify-between gap-2 rounded-md border border-[var(--hairline)] bg-[var(--dashboard-card)] px-2 py-1.5"
                                  >
                                    <span className="min-w-0 text-xs font-medium text-brand-navy">
                                      {delegateLabel(userId)}
                                    </span>
                                    {canEditSponsors ? (
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => updateSponsor(r.id, col.role, "remove", userId)}
                                        className="shrink-0 text-[0.65rem] font-medium text-red-700 hover:underline dark:text-red-300 disabled:opacity-50"
                                      >
                                        {t("removePerson")}
                                      </button>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                            {canEditSponsors ? (
                              <div className="flex flex-col gap-1.5">
                                <select
                                  className={`${inputCls} text-xs`}
                                  value={sponsorPick[pickKey] ?? ""}
                                  onChange={(e) =>
                                    setSponsorPick((prev) => ({ ...prev, [pickKey]: e.target.value }))
                                  }
                                >
                                  <option value="">{t("selectDelegate")}</option>
                                  {available.map((d) => (
                                    <option key={d.userId} value={d.userId}>
                                      {d.country}
                                      {d.displayName.trim() && d.displayName.trim() !== d.country
                                        ? ` — ${d.displayName}`
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={pending || !(sponsorPick[pickKey] ?? "").trim()}
                                  onClick={() =>
                                    updateSponsor(r.id, col.role, "add", sponsorPick[pickKey] ?? "")
                                  }
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs font-medium text-brand-navy hover:bg-white/5 disabled:opacity-50"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {t("addPerson")}
                                </button>
                              </div>
                            ) : null}
                            {!canCreate &&
                            !isFinalized &&
                            col.role === "signatory" &&
                            !onThisDraft ? (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => updateSponsor(r.id, "signatory", "add", currentUserId)}
                                className="w-full rounded-lg border border-[var(--hairline)] px-2 py-1.5 text-xs font-medium text-brand-navy hover:bg-white/5 disabled:opacity-50"
                              >
                                {t("signMyself")}
                              </button>
                            ) : null}
                            {isFinalized ? (
                              <p className="text-[0.65rem] text-brand-muted">{t("sponsorsLocked")}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Google Doc link (members or staff) */}
              {isMember || canCreate ? (
                <div className="space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] p-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-brand-muted">
                    {t("docLinkLabel")}
                  </label>
                  {isFinalized ? (
                    <p className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
                      <Lock className="h-3.5 w-3.5" />
                      {t("lockedForFinalized")}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="url"
                        value={docLinkDrafts[r.id] ?? ""}
                        onChange={(e) =>
                          setDocLinkDrafts((s) => ({ ...s, [r.id]: e.target.value }))
                        }
                        placeholder={t("docLinkPlaceholder")}
                        className={`${inputCls} min-w-[220px] flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => saveDocLink(r.id)}
                        disabled={pending}
                        className="rounded-lg bg-brand-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {t("saveDocLink")}
                      </button>
                    </div>
                  )}
                  {docLinkStatus[r.id] ? (
                    <p className="text-xs text-brand-diplomatic">{docLinkStatus[r.id]}</p>
                  ) : null}
                  {hasDocLink ? (
                    <>
                      <a
                        href={r.google_docs_url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-brand-diplomatic hover:underline dark:text-brand-accent-bright"
                      >
                        <FileCheck className="h-4 w-4 shrink-0" />
                        {t("openInNewTab")}
                      </a>
                      <GoogleDocsEmbed googleDocsUrl={r.google_docs_url as string} />
                    </>
                  ) : (
                    <p className="text-xs text-brand-muted">{t("noGoogleDocLink")}</p>
                  )}
                </div>
              ) : null}

              {/* Finalize (members or staff) */}
              {(isMember || canCreate) && !isFinalized ? (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => finalize(r.id)}
                    disabled={!hasDocLink || pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-diplomatic px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {pending ? t("finalizing") : t("finalizeButton")}
                  </button>
                  {!hasDocLink ? (
                    <p className="text-xs text-brand-muted">{t("finalizeNeedsDoc")}</p>
                  ) : null}
                  {finalizeError[r.id] ? (
                    <p className="text-xs text-red-700 dark:text-red-300">{finalizeError[r.id]}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Clauses: read-only for delegates, editable override for chairs */}
              <div className="space-y-2 border-t border-[var(--hairline)] pt-3">
                <p className="text-sm font-medium text-brand-navy">
                  {isFinalized ? t("extractedClausesTitle") : t("clauseEditor")}
                </p>
                {resolutionClauses.length === 0 ? (
                  <p className="text-xs text-brand-muted">{t("noClausesYet")}</p>
                ) : (
                  <ul className="space-y-2">
                    {resolutionClauses.map((c) => {
                      const draft = editingClause[c.id] ?? c.clause_text;
                      return (
                        <li
                          key={c.id}
                          className="space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] p-2"
                        >
                          <p className="text-xs font-medium text-brand-muted">
                            {t("clauseNumber", { number: c.clause_number })}
                          </p>
                          {canCreate ? (
                            <>
                              <textarea
                                className={inputCls}
                                value={draft}
                                onChange={(e) =>
                                  setEditingClause((prev) => ({ ...prev, [c.id]: e.target.value }))
                                }
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="rounded bg-brand-accent px-2 py-1 text-xs font-medium text-white"
                                  onClick={() => saveClause(c.id)}
                                >
                                  {t("saveClause")}
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-red-400/40 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300"
                                  onClick={() => deleteClause(c.id)}
                                >
                                  {t("delete")}
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm text-brand-navy">{c.clause_text}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {canCreate ? (
                  <div className="space-y-2">
                    <textarea
                      className={inputCls}
                      value={newClause[r.id] ?? ""}
                      onChange={(e) => setNewClause((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder={t("addClausePlaceholder")}
                    />
                    <button
                      type="button"
                      className="rounded bg-brand-accent px-3 py-1 text-sm font-medium text-white"
                      onClick={() => addClause(r.id)}
                    >
                      {t("addClause")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        }}
      />
      )}
    </div>
  );
}
