"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DelegationNotesView } from "@/components/delegation-notes/DelegationNotesView";
import {
  getSmtDelegationNotesComposeContext,
  type SmtDelegationNotesComposeContext,
} from "@/app/actions/smtDelegationNotesCompose";
import { dedupeCommitteeOptionsByLabel } from "@/lib/delegation-notes-options";

type CommitteeOpt = { id: string; label: string };

export function SmtNotesCompose({
  committees,
  myUserId,
  myProfileName,
  onNoteCreated,
}: {
  committees: CommitteeOpt[];
  myUserId: string;
  myProfileName: string;
  onNoteCreated?: () => void;
}) {
  const t = useTranslations("smtNotesPage");
  const router = useRouter();
  const committeeOptions = useMemo(() => dedupeCommitteeOptionsByLabel(committees), [committees]);
  const [conferenceId, setConferenceId] = useState(committees[0]?.id ?? "");
  const [ctx, setCtx] = useState<SmtDelegationNotesComposeContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async (confId: string) => {
    if (!confId) {
      setCtx(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getSmtDelegationNotesComposeContext(confId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setCtx(null);
      return;
    }
    setCtx(res.context ?? null);
  }, []);

  useEffect(() => {
    void loadContext(conferenceId);
  }, [conferenceId, loadContext]);

  useEffect(() => {
    if (committeeOptions.length === 0) return;
    if (!committeeOptions.some((c) => c.id === conferenceId)) {
      setConferenceId(committeeOptions[0]!.id);
    }
  }, [committeeOptions, conferenceId]);

  if (committeeOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-brand-navy/15 px-4 py-3 text-sm text-brand-muted">
        {t("composeNoCommittees")}
      </p>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-brand-navy/10 bg-brand-paper/80 p-4 md:p-6">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("composeTitle")}</h2>
        <p className="text-sm text-brand-muted">{t("composeHint")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-brand-muted">
            {t("composeCommitteeLabel")}
          </span>
          <select
            className="mun-field w-full py-2.5"
            value={conferenceId}
            onChange={(e) => setConferenceId(e.target.value)}
          >
            {committeeOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {loading ? <p className="text-xs text-brand-muted">{t("composeLoading")}</p> : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {ctx && !loading ? (
        <DelegationNotesView
          key={ctx.canonicalConferenceId}
          conferenceId={ctx.canonicalConferenceId}
          initialNotes={[]}
          myUserId={myUserId}
          myRole="smt"
          smtVerified
          smtSecretariatCompose
          composeOnly
          composeTitle={t("composeFormTitle")}
          myAllocationId={null}
          myProfileName={myProfileName}
          allocationOptions={ctx.allocationOptions}
          chairOptions={ctx.chairOptions}
          advisorByAllocationId={ctx.advisorByAllocationId}
          sessionActive={ctx.sessionActive}
          unmoderatedLocked={ctx.unmoderatedLocked}
          votingProcedureLocked={ctx.votingProcedureLocked}
          onNoteCreated={() => {
            onNoteCreated?.();
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
