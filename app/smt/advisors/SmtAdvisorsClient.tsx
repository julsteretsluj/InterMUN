"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  smtAssignAdvisorDelegateAction,
  smtInviteAdvisorAction,
  type AdvisorStaffFormState,
} from "@/app/actions/advisorStaff";

export type SmtAdvisorAssignmentRow = {
  id: string;
  allocationId: string;
  country: string;
  advisorName: string;
};

export type SmtDelegateAllocationRef = {
  id: string;
  country: string;
  committee: string;
};

export function SmtAdvisorsClient({
  adminInviteConfigured,
  allocationRefs,
  assignments,
}: {
  adminInviteConfigured: boolean;
  allocationRefs: SmtDelegateAllocationRef[];
  assignments: SmtAdvisorAssignmentRow[];
}) {
  const t = useTranslations("smtAdvisorsPage");
  const [inviteState, inviteAction, invitePending] = useActionState(smtInviteAdvisorAction, null as AdvisorStaffFormState | null);
  const [assignState, assignAction, assignPending] = useActionState(
    smtAssignAdvisorDelegateAction,
    null as AdvisorStaffFormState | null
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("inviteTitle")}</h2>
        <p className="mt-1 text-sm text-brand-muted">{t("inviteBody")}</p>
        {!adminInviteConfigured ? (
          <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">{t("inviteSetupTitle")}</p>
            <p className="mt-2">{t("inviteDisabled")}</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[0.85rem]">
              <li>{t("inviteSetupStep1")}</li>
              <li>{t("inviteSetupStep2")}</li>
              <li>{t("inviteSetupStep3")}</li>
              <li>{t("inviteSetupStep4")}</li>
            </ol>
          </div>
        ) : (
          <form action={inviteAction} className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm">
              <span className="font-medium text-brand-navy">{t("emailLabel")}</span>
              <input
                type="email"
                name="email"
                required
                className="mun-field mt-1 w-full"
                placeholder={t("emailPlaceholder")}
              />
            </label>
            <button type="submit" disabled={invitePending} className="mun-btn-primary px-4 py-2 text-sm">
              {invitePending ? t("sending") : t("inviteButton")}
            </button>
          </form>
        )}
        {inviteState?.error ? <p className="mt-2 text-sm text-red-600">{inviteState.error}</p> : null}
        {inviteState?.success ? <p className="mt-2 text-sm text-brand-accent">{inviteState.success}</p> : null}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("assignTitle")}</h2>
        <p className="mt-1 text-sm text-brand-muted">{t("assignBody")}</p>
        <form action={assignAction} className="mt-4 grid max-w-xl gap-3">
          <label className="text-sm">
            <span className="font-medium text-brand-navy">{t("advisorEmailLabel")}</span>
            <input type="email" name="advisor_email" required className="mun-field mt-1 w-full" />
          </label>
          <label className="text-sm">
            <span className="font-medium text-brand-navy">{t("delegateAllocationIdLabel")}</span>
            <input
              type="text"
              name="delegate_allocation_id"
              required
              spellCheck={false}
              autoComplete="off"
              className="mun-field mt-1 w-full font-mono text-xs"
              placeholder={t("delegateAllocationIdPlaceholder")}
            />
          </label>
          <button type="submit" disabled={assignPending} className="mun-btn-primary w-fit px-4 py-2 text-sm">
            {assignPending ? t("saving") : t("assignButton")}
          </button>
        </form>
        {assignState?.error ? <p className="mt-2 text-sm text-red-600">{assignState.error}</p> : null}
        {assignState?.success ? <p className="mt-2 text-sm text-brand-accent">{assignState.success}</p> : null}
      </section>

      {assignments.length > 0 ? (
        <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-brand-navy">{t("currentAssignmentsTitle")}</h2>
          <p className="mt-1 text-sm text-brand-muted">{t("currentAssignmentsHint")}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-brand-navy/10">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-navy/10 bg-brand-navy/[0.04] text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">{t("colAdvisor")}</th>
                  <th className="px-3 py-2">{t("colAllocationId")}</th>
                  <th className="px-3 py-2">{t("colCountry")}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((row) => (
                  <tr key={row.id} className="border-b border-brand-navy/8 last:border-0">
                    <td className="px-3 py-2 font-medium text-brand-navy dark:text-zinc-100">{row.advisorName}</td>
                    <td className="px-3 py-2 font-mono text-[0.7rem] text-brand-muted">{row.allocationId}</td>
                    <td className="px-3 py-2 text-brand-navy/90 dark:text-zinc-200">{row.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {allocationRefs.length > 0 ? (
        <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-brand-navy">{t("allocationIdsTitle")}</h2>
          <p className="mt-1 text-sm text-brand-muted">{t("allocationIdsHint")}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-brand-navy/10">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-navy/10 bg-brand-navy/[0.04] text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-3 py-2">{t("colAllocationId")}</th>
                  <th className="px-3 py-2">{t("colCountry")}</th>
                  <th className="px-3 py-2">{t("colCommittee")}</th>
                </tr>
              </thead>
              <tbody>
                {allocationRefs.map((row) => (
                  <tr key={row.id} className="border-b border-brand-navy/8 last:border-0">
                    <td className="px-3 py-2 font-mono text-[0.7rem] text-brand-navy dark:text-zinc-100">{row.id}</td>
                    <td className="px-3 py-2 text-brand-navy/90 dark:text-zinc-200">{row.country}</td>
                    <td className="px-3 py-2 text-brand-muted">{row.committee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
