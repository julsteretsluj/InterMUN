"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  smtAssignAdvisorDelegateAction,
  smtInviteAdvisorAction,
  type AdvisorStaffFormState,
} from "@/app/actions/advisorStaff";

export function SmtAdvisorsClient({
  adminInviteConfigured,
  allocations,
  assignments,
}: {
  adminInviteConfigured: boolean;
  allocations: { id: string; country: string; conference_id: string }[];
  assignments: { allocationId: string; advisorName: string }[];
}) {
  const t = useTranslations("smtAdvisorsPage");
  const [inviteState, inviteAction, invitePending] = useActionState(smtInviteAdvisorAction, null as AdvisorStaffFormState | null);
  const [assignState, assignAction, assignPending] = useActionState(
    smtAssignAdvisorDelegateAction,
    null as AdvisorStaffFormState | null
  );

  const assignmentByAlloc = new Map(assignments.map((a) => [a.allocationId, a.advisorName]));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("inviteTitle")}</h2>
        <p className="mt-1 text-sm text-brand-muted">{t("inviteBody")}</p>
        {!adminInviteConfigured ? (
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">{t("inviteDisabled")}</p>
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
            <span className="font-medium text-brand-navy">{t("delegateLabel")}</span>
            <select name="delegate_allocation_id" required className="mun-field mt-1 w-full">
              <option value="">{t("delegatePlaceholder")}</option>
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.country}
                  {assignmentByAlloc.has(a.id) ? ` (${t("assignedTo", { name: assignmentByAlloc.get(a.id)! })})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={assignPending} className="mun-btn-primary w-fit px-4 py-2 text-sm">
            {assignPending ? t("saving") : t("assignButton")}
          </button>
        </form>
        {assignState?.error ? <p className="mt-2 text-sm text-red-600">{assignState.error}</p> : null}
        {assignState?.success ? <p className="mt-2 text-sm text-brand-accent">{assignState.success}</p> : null}
      </section>
    </div>
  );
}
