"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus2, Gavel, Trash2 } from "lucide-react";
import {
  deleteAmendmentAction,
  reviewAmendmentAction,
  submitAmendmentAction,
  type AmendmentClassification,
  type AmendmentType,
} from "@/app/actions/amendments";

type Clause = {
  id: string;
  resolution_id: string;
  clause_number: number;
  clause_text: string;
};

type ResolutionPick = { id: string; googleDocsUrl: string | null };

type Amendment = {
  id: string;
  conference_id: string;
  resolution_id: string;
  submitted_by: string | null;
  delegate_country: string | null;
  delegate_email: string | null;
  amendment_type: AmendmentType;
  target_clause_number: number | null;
  original_clause: string | null;
  proposed_clause: string | null;
  classification: AmendmentClassification | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
};

const inputCls =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/25";
const labelCls = "block text-xs font-medium uppercase tracking-wide text-white/60";

export function AmendmentsView({
  conferenceId,
  userId,
  isStaff,
  mainSubmitterResolutionIds,
  resolutions,
  clauses,
  initialAmendments,
}: {
  conferenceId: string;
  userId: string;
  isStaff: boolean;
  mainSubmitterResolutionIds: string[];
  resolutions: ResolutionPick[];
  clauses: Clause[];
  initialAmendments: Amendment[];
}) {
  const t = useTranslations("amendments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const mainSubmitterSet = useMemo(
    () => new Set(mainSubmitterResolutionIds),
    [mainSubmitterResolutionIds]
  );

  const [resolutionId, setResolutionId] = useState(resolutions[0]?.id ?? "");
  const [amendmentType, setAmendmentType] = useState<AmendmentType>("replace");
  const [clauseNumber, setClauseNumber] = useState<string>("");
  const [originalClause, setOriginalClause] = useState("");
  const [proposedClause, setProposedClause] = useState("");
  const [email, setEmail] = useState("");

  const resolutionLabel = (id: string) => {
    const idx = resolutions.findIndex((r) => r.id === id);
    return idx >= 0 ? t("resolutionN", { n: idx + 1 }) : t("resolution");
  };

  const clausesForResolution = useMemo(
    () =>
      clauses
        .filter((c) => c.resolution_id === resolutionId)
        .sort((a, b) => a.clause_number - b.clause_number),
    [clauses, resolutionId]
  );

  function onPickClause(numStr: string) {
    setClauseNumber(numStr);
    const num = Number(numStr);
    const match = clausesForResolution.find((c) => c.clause_number === num);
    if (match && amendmentType !== "add") {
      setOriginalClause(match.clause_text);
    }
  }

  function submit() {
    setMsg(null);
    if (!resolutionId) {
      setMsg({ kind: "err", text: t("errSelectResolution") });
      return;
    }
    startTransition(async () => {
      const res = await submitAmendmentAction({
        conferenceId,
        resolutionId,
        amendmentType,
        targetClauseNumber: clauseNumber ? Number(clauseNumber) : null,
        originalClause,
        proposedClause,
        delegateEmail: email,
      });
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: t("okSubmitted") });
      setProposedClause("");
      setOriginalClause("");
      setClauseNumber("");
      router.refresh();
    });
  }

  function review(id: string, status: "approved" | "rejected", classification: AmendmentClassification | null) {
    setMsg(null);
    startTransition(async () => {
      const res = await reviewAmendmentAction({ amendmentId: id, status, classification });
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteAmendmentAction({ amendmentId: id });
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  const canReview = (a: Amendment) => isStaff || mainSubmitterSet.has(a.resolution_id);
  const canDelete = (a: Amendment) =>
    isStaff || (a.submitted_by === userId && a.status === "pending");

  const hasResolutions = resolutions.length > 0;

  return (
    <div className="space-y-6">
      {msg ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.kind === "ok"
              ? "border-brand-accent/40 bg-brand-accent/10 text-white"
              : "border-red-400/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      {/* Submit form */}
      <section className="dashboard-panel space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <FilePlus2 className="h-5 w-5 text-brand-accent" />
          <h2 className="text-base font-semibold text-white">{t("submitTitle")}</h2>
        </div>
        <p className="text-sm text-white/60">{t("submitHelp")}</p>

        {!hasResolutions ? (
          <p className="text-sm text-white/60">{t("noResolutions")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={labelCls}>{t("resolution")}</span>
              <select
                className={inputCls}
                value={resolutionId}
                onChange={(e) => {
                  setResolutionId(e.target.value);
                  setClauseNumber("");
                  setOriginalClause("");
                }}
              >
                {resolutions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {resolutionLabel(r.id)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className={labelCls}>{t("type")}</span>
              <select
                className={inputCls}
                value={amendmentType}
                onChange={(e) => setAmendmentType(e.target.value as AmendmentType)}
              >
                <option value="add">{t("typeAdd")}</option>
                <option value="replace">{t("typeReplace")}</option>
                <option value="delete">{t("typeDelete")}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className={labelCls}>{t("clauseNumber")}</span>
              {clausesForResolution.length > 0 && amendmentType !== "add" ? (
                <select
                  className={inputCls}
                  value={clauseNumber}
                  onChange={(e) => onPickClause(e.target.value)}
                >
                  <option value="">{t("selectClause")}</option>
                  {clausesForResolution.map((c) => (
                    <option key={c.id} value={c.clause_number}>
                      {t("clauseN", { n: c.clause_number })}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={clauseNumber}
                  onChange={(e) => setClauseNumber(e.target.value)}
                  placeholder={t("clauseNumberPlaceholder")}
                />
              )}
            </label>

            <label className="space-y-1">
              <span className={labelCls}>{t("delegateEmail")}</span>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("delegateEmailPlaceholder")}
              />
            </label>

            {amendmentType !== "add" ? (
              <label className="space-y-1 sm:col-span-2">
                <span className={labelCls}>{t("originalClause")}</span>
                <textarea
                  className={`${inputCls} min-h-[72px]`}
                  value={originalClause}
                  onChange={(e) => setOriginalClause(e.target.value)}
                  placeholder={t("originalClausePlaceholder")}
                />
              </label>
            ) : null}

            {amendmentType !== "delete" ? (
              <label className="space-y-1 sm:col-span-2">
                <span className={labelCls}>{t("proposedClause")}</span>
                <textarea
                  className={`${inputCls} min-h-[72px]`}
                  value={proposedClause}
                  onChange={(e) => setProposedClause(e.target.value)}
                  placeholder={t("proposedClausePlaceholder")}
                />
              </label>
            ) : null}

            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {t("submit")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* List */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-brand-accent" />
          <h2 className="text-base font-semibold text-white">{t("listTitle")}</h2>
        </div>

        {initialAmendments.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-black/15 px-3 py-6 text-center text-sm text-white/50">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {initialAmendments.map((a, i) => (
              <li key={a.id} className="dashboard-panel space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {t("amendmentN", { n: initialAmendments.length - i })}
                  </span>
                  <TypeBadge type={a.amendment_type} label={t(`typeBadge_${a.amendment_type}`)} />
                  <StatusBadge status={a.status} label={t(`status_${a.status}`)} />
                  {a.classification ? (
                    <ClassificationBadge
                      classification={a.classification}
                      label={t(a.classification)}
                    />
                  ) : null}
                  <span className="ml-auto text-xs text-white/50">
                    {resolutionLabel(a.resolution_id)}
                    {a.target_clause_number != null
                      ? ` · ${t("clauseN", { n: a.target_clause_number })}`
                      : ""}
                  </span>
                </div>

                <div className="text-xs text-white/60">
                  {a.delegate_country ? (
                    <span className="font-medium text-white/80">{a.delegate_country}</span>
                  ) : (
                    t("unknownDelegate")
                  )}
                  {a.delegate_email ? <span> · {a.delegate_email}</span> : null}
                </div>

                {a.original_clause ? (
                  <div className="rounded-md border border-white/10 bg-black/20 p-2">
                    <p className={labelCls}>{t("originalClause")}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/70 line-through decoration-red-400/50">
                      {a.original_clause}
                    </p>
                  </div>
                ) : null}
                {a.proposed_clause ? (
                  <div className="rounded-md border border-brand-accent/25 bg-brand-accent/5 p-2">
                    <p className={labelCls}>{t("proposedClause")}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/90">
                      {a.proposed_clause}
                    </p>
                  </div>
                ) : null}

                {canReview(a) || canDelete(a) ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                    {canReview(a) ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => review(a.id, "approved", "friendly")}
                          className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {t("markFriendly")}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => review(a.id, "approved", "unfriendly")}
                          className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {t("markUnfriendly")}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => review(a.id, "rejected", a.classification)}
                          className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {t("reject")}
                        </button>
                      </>
                    ) : null}
                    {canDelete(a) ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(a.id)}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isStaff ? t("delete") : t("withdraw")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TypeBadge({ type, label }: { type: AmendmentType; label: string }) {
  const cls =
    type === "add"
      ? "border-emerald-400/40 text-emerald-200"
      : type === "delete"
        ? "border-red-400/40 text-red-200"
        : "border-sky-400/40 text-sky-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const cls =
    status === "approved"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : status === "rejected"
        ? "border-red-400/40 bg-red-500/10 text-red-200"
        : "border-white/20 bg-white/5 text-white/60";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
  );
}

function ClassificationBadge({
  classification,
  label,
}: {
  classification: AmendmentClassification;
  label: string;
}) {
  const cls =
    classification === "friendly"
      ? "border-emerald-400/40 text-emerald-200"
      : "border-amber-400/40 text-amber-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
  );
}
