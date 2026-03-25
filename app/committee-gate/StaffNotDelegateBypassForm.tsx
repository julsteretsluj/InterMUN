"use client";

import { useActionState, useEffect } from "react";
import { verifyStaffNotDelegateBypass } from "@/app/actions/committeeGate";

type Props = {
  conferenceId: string;
  nextPath: string;
};

export function StaffNotDelegateBypassForm({ conferenceId, nextPath }: Props) {
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
    <form action={formAction} className="space-y-4 rounded-xl border border-brand-gold/40 bg-brand-cream/40 p-4">
      <input type="hidden" name="conference_id" value={conferenceId} />
      <input type="hidden" name="next" value={nextPath} />

      <p className="text-sm font-medium text-brand-navy">I&apos;m not a delegate</p>
      <p className="text-xs text-brand-muted">
        Chairs and SMT only. Enter the <strong>staff secondary password</strong> provided by
        organisers — not the committee room password delegates use.
      </p>

      <div>
        <label
          htmlFor="staff_secondary_password"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          Staff secondary password
        </label>
        <input
          id="staff_secondary_password"
          name="staff_secondary_password"
          type="password"
          autoComplete="off"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          placeholder="Organiser password"
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
        className="w-full py-2.5 rounded-lg border-2 border-brand-gold text-brand-navy font-medium hover:bg-brand-cream/80 transition-colors disabled:opacity-50 text-sm"
      >
        {pending ? "Verifying…" : "Continue as chair / SMT (not a delegate)"}
      </button>
    </form>
  );
}
