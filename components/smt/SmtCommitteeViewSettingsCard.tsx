"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  switchSmtToSecretariatAction,
  switchSmtToChairExperienceAction,
  switchSmtToDelegateExperienceAction,
  updateSmtCommitteeBindingsAction,
} from "@/app/actions/smtDashboardSurface";

export function SmtCommitteeViewSettingsCard({
  conferences,
  delegateSeats,
  currentChairId,
  currentDelegateAllocationId,
}: {
  conferences: { id: string; label: string }[];
  delegateSeats: { id: string; label: string }[];
  currentChairId: string | null;
  currentDelegateAllocationId: string | null;
}) {
  const t = useTranslations("smtCommitteeView");
  const searchParams = useSearchParams();
  const bindHint = searchParams.get("smtBind") === "1";
  const [chairId, setChairId] = useState(currentChairId ?? "");
  const [delegateAllocId, setDelegateAllocId] = useState(currentDelegateAllocationId ?? "");
  const [bindMsg, setBindMsg] = useState<string | null>(null);
  const [surfaceMsg, setSurfaceMsg] = useState<string | null>(null);
  const [pendingBindings, startBindings] = useTransition();
  const [pendingSurface, startSurface] = useTransition();

  function saveBindings() {
    setBindMsg(null);
    const fd = new FormData();
    fd.set("smt_chair_conference_id", chairId.trim());
    fd.set("smt_delegate_allocation_id", delegateAllocId.trim());
    startBindings(async () => {
      const err = await updateSmtCommitteeBindingsAction(null, fd);
      setBindMsg(err?.error ?? t("bindingsSaved"));
    });
  }

  function goSecretariat() {
    setSurfaceMsg(null);
    startSurface(async () => {
      try {
        await switchSmtToSecretariatAction();
      } catch {
        setSurfaceMsg(t("surfaceSwitchError"));
      }
    });
  }

  function goChair() {
    setSurfaceMsg(null);
    if (!chairId.trim()) {
      setSurfaceMsg(t("pickChairFirst"));
      return;
    }
    startSurface(async () => {
      try {
        await switchSmtToChairExperienceAction(chairId.trim());
      } catch {
        setSurfaceMsg(t("surfaceSwitchError"));
      }
    });
  }

  function goDelegate() {
    setSurfaceMsg(null);
    if (!delegateAllocId.trim()) {
      setSurfaceMsg(t("pickDelegateFirst"));
      return;
    }
    startSurface(async () => {
      try {
        await switchSmtToDelegateExperienceAction(delegateAllocId.trim());
      } catch {
        setSurfaceMsg(t("surfaceSwitchError"));
      }
    });
  }

  return (
    <section className="mb-8 rounded-xl border border-brand-navy/15 bg-brand-paper/80 p-4 md:p-5 dark:border-zinc-600 dark:bg-zinc-900/60">
      <h2 className="font-display text-lg font-semibold text-brand-navy dark:text-zinc-100">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-brand-muted dark:text-zinc-400">{t("intro")}</p>

      {bindHint ? (
        <p className="mt-3 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
          {t("bindRequiredHint")}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-brand-muted dark:text-zinc-400">
            {t("chairCommitteeLabel")}
          </label>
          <select
            value={chairId}
            onChange={(e) => setChairId(e.target.value)}
            className="mt-1 w-full max-w-xl rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">{t("chairCommitteePlaceholder")}</option>
            {conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-brand-muted dark:text-zinc-400">
            {t("delegateSeatLabel")}
          </label>
          <select
            value={delegateAllocId}
            onChange={(e) => setDelegateAllocId(e.target.value)}
            className="mt-1 w-full max-w-xl rounded-lg border border-brand-navy/15 bg-white px-3 py-2 text-sm text-brand-navy dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">{t("delegateSeatPlaceholder")}</option>
            {delegateSeats.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={pendingBindings}
          onClick={() => saveBindings()}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {t("saveBindings")}
        </button>
        {bindMsg ? (
          <p className="text-sm text-brand-navy dark:text-zinc-200" role="status">
            {bindMsg}
          </p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-brand-navy/10 pt-5 dark:border-zinc-700">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted dark:text-zinc-400">
          {t("switchViewHeading")}
        </p>
        <p className="mt-1 text-sm text-brand-muted dark:text-zinc-400">{t("switchViewHelp")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pendingSurface}
            onClick={() => void goSecretariat()}
            className="rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream/60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {t("goSecretariat")}
          </button>
          <button
            type="button"
            disabled={pendingSurface}
            onClick={() => void goChair()}
            className="rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream/60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {t("goChair")}
          </button>
          <button
            type="button"
            disabled={pendingSurface}
            onClick={() => void goDelegate()}
            className="rounded-lg border border-brand-navy/20 bg-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream/60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {t("goDelegate")}
          </button>
        </div>
        {surfaceMsg ? <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{surfaceMsg}</p> : null}
      </div>
    </section>
  );
}
