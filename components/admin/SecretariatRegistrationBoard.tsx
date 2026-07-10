// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  archiveSecretariatIntakeAction,
  markSecretariatIntakeCompleteAction,
  type SecretariatRegistrationAdminState,
} from "@/app/actions/secretariatRegistrationAdmin";

type Row = {
  id: string;
  contact_name: string;
  contact_email: string;
  conference_name: string;
  committee_count: number;
  delegate_count: number | null;
  chair_count: number | null;
  rop_status: string;
  schedule_status: string;
  award_criteria_status: string;
  matrix_deferred: boolean;
  submitted_at: string;
  selected_features: string[];
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone =
    status === "complete"
      ? "bg-emerald-100 text-emerald-900"
      : status === "pending_review"
        ? "bg-amber-100 text-amber-900"
        : status === "deferred"
          ? "bg-sky-100 text-sky-900"
          : "bg-zinc-100 text-zinc-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase ${tone}`}>
      {label}: {status.replace(/_/g, " ")}
    </span>
  );
}

function MarkCompleteButton({ requestId, field }: { requestId: string; field: "rop" | "schedule" | "award_criteria" }) {
  const t = useTranslations("secretariatRegistration.admin");
  const [state, action, pending] = useActionState(
    markSecretariatIntakeCompleteAction,
    null as SecretariatRegistrationAdminState | null
  );

  return (
    <form action={action} className="inline">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="field" value={field} />
      <button
        type="submit"
        disabled={pending}
        className="mun-btn text-xs px-2 py-1 disabled:opacity-50"
      >
        {pending ? "…" : t("markComplete")}
      </button>
      {state?.error ? <span className="ml-2 text-xs text-rose-600">{state.error}</span> : null}
    </form>
  );
}

export function SecretariatRegistrationBoard({ rows }: { rows: Row[] }) {
  const t = useTranslations("secretariatRegistration.admin");

  if (rows.length === 0) {
    return <p className="text-sm text-brand-muted">{t("empty")}</p>;
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold text-brand-navy">{row.conference_name}</h3>
              <p className="text-sm text-brand-muted">
                {row.contact_name} · {row.contact_email}
              </p>
              <p className="text-xs text-brand-muted mt-1">
                {t("submitted")}: {new Date(row.submitted_at).toLocaleString()}
              </p>
            </div>
            <form action={archiveSecretariatIntakeAction}>
              <input type="hidden" name="requestId" value={row.id} />
              <button type="submit" className="mun-btn text-xs px-2 py-1">
                {t("archive")}
              </button>
            </form>
          </div>
          <p className="text-xs text-brand-muted">
            {t("summaryCounts", {
              committees: row.committee_count,
              delegates: row.delegate_count ?? "—",
              chairs: row.chair_count ?? "—",
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={row.rop_status} label={t("itemRop")} />
            <StatusBadge status={row.schedule_status} label={t("itemSchedule")} />
            <StatusBadge status={row.award_criteria_status} label={t("itemAwardCriteria")} />
            {row.matrix_deferred ? (
              <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-sky-900">
                {t("matrixDeferred")}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {row.rop_status === "pending_review" ? (
              <MarkCompleteButton requestId={row.id} field="rop" />
            ) : null}
            {row.schedule_status === "pending_review" ? (
              <MarkCompleteButton requestId={row.id} field="schedule" />
            ) : null}
            {row.award_criteria_status === "pending_review" ? (
              <MarkCompleteButton requestId={row.id} field="award_criteria" />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
