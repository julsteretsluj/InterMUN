"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { verifyStaffNotDelegateBypass } from "@/app/actions/committeeGate";

type Props = {
  conferenceId: string;
  nextPath: string;
};

export function StaffNotDelegateBypassForm({ conferenceId, nextPath }: Props) {
  const tForm = useTranslations("staffBypassForm");
  const [state, formAction, pending] = useActionState(
    verifyStaffNotDelegateBypass,
    null as { error?: string } | null
  );

  useEffect(() => {
    if (state?.error) {
      document.getElementById("staff-bypass-error")?.focus();
    }
  }, [state?.error]);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-brand-accent/40 bg-brand-cream/40 p-4">
      <input type="hidden" name="conference_id" value={conferenceId} />
      <input type="hidden" name="next" value={nextPath} />

      <p className="text-sm font-medium text-brand-navy">{tForm("title")}</p>
      <p className="text-xs text-brand-muted">
        {tForm.rich("description", {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>

      <div>
        <label
          htmlFor="staff_secondary_password"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          {tForm("staffSecondaryPassword")}
        </label>
        <input
          id="staff_secondary_password"
          name="staff_secondary_password"
          type="password"
          autoComplete="off"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          placeholder={tForm("organiserPasswordPlaceholder")}
        />
      </div>

      {state?.error && (
        <p
          id="staff-bypass-error"
          tabIndex={-1}
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-lg border-2 border-brand-accent text-brand-navy font-medium hover:bg-brand-cream/80 transition-colors disabled:opacity-50 text-sm"
      >
        {pending ? tForm("verifying") : tForm("continueAsSmt")}
      </button>
    </form>
  );
}
