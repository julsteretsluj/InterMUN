"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { chairAssignDelegateByEmailAction } from "@/app/actions/allocationSignup";
import { HelpButton } from "@/components/HelpButton";

type AllocationOption = { id: string; country: string; user_id: string | null };

const INITIAL_STATE = {} as { error?: string; success?: boolean };

export function ChairDelegateApprovalByEmailForm({
  conferenceId,
  allocationOptions,
}: {
  conferenceId: string;
  allocationOptions: AllocationOption[];
}) {
  const t = useTranslations("chairDelegateApprovalForm");
  const tCommon = useTranslations("common");
  const tMatrix = useTranslations("allocationMatrixManager");
  const [state, formAction, pending] = useActionState(chairAssignDelegateByEmailAction, INITIAL_STATE);

  return (
    <section className="mt-6 rounded-lg border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy">
          {t("title")}
        </h2>
        <HelpButton title={t("helpTitleAcceptDelegate")}>
          {t("helpAcceptDelegateBody")}
        </HelpButton>
      </div>
      <p className="text-xs text-brand-muted mt-1 mb-3">
        {t("intro")}
      </p>

      <form action={formAction} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <input type="hidden" name="conference_id" value={conferenceId} />
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs text-brand-muted">Delegate email</label>
            <HelpButton title={t("delegateEmailLabel")}>
              {t("delegateEmailHelp")}
            </HelpButton>
          </div>
          <input
            type="email"
            name="email"
            required
            placeholder={t("delegateEmailPlaceholder")}
            className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs text-brand-muted">{tMatrix("countryPosition")}</label>
            <HelpButton title={tMatrix("countryPosition")}>
              {t("allocationHelp")}
            </HelpButton>
          </div>
          <select
            name="allocation_id"
            required
            className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              {t("selectAllocation")}
            </option>
            {allocationOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.country}
                {opt.user_id ? ` (${t("currentlyAssigned")})` : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? t("accepting") : t("acceptDelegate")}
        </button>
      </form>

      {state?.error ? (
        <p className="mt-3 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-3 text-sm rounded-md border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-brand-navy">
          {t("success")}
        </p>
      ) : null}
    </section>
  );
}
