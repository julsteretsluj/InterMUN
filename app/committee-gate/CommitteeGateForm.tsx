"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { verifyCommitteeSecondaryLogin } from "@/app/actions/committeeGate";

type Props = {
  conferenceId: string;
  conferenceTitle: string;
  allocationChoices: string[];
  initialAllocation: string | null;
  nextPath: string;
};

export function CommitteeGateForm({
  conferenceId,
  conferenceTitle,
  allocationChoices,
  initialAllocation,
  nextPath,
}: Props) {
  const [state, formAction, pending] = useActionState(
    verifyCommitteeSecondaryLogin,
    null as { error?: string } | null
  );

  useEffect(() => {
    if (state?.error) {
      const el = document.getElementById("committee-gate-error");
      el?.focus();
    }
  }, [state?.error]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="conference_id" value={conferenceId} />
      <input type="hidden" name="next" value={nextPath} />

      <div className="rounded-lg border border-brand-navy/10 bg-brand-cream/50 px-3 py-2 text-sm text-brand-muted">
        <span className="font-medium text-brand-navy">Conference: </span>
        {conferenceTitle}
      </div>

      <div>
        <label
          htmlFor="allocation"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          Allocation (country / position)
        </label>
        {allocationChoices.length === 1 ? (
          <>
            <input type="hidden" name="allocation" value={allocationChoices[0]} />
            <p className="text-sm font-medium text-brand-navy py-2 px-3 rounded-lg border border-brand-navy/15 bg-white">
              {allocationChoices[0]}
            </p>
          </>
        ) : (
          <>
            <select
              id="allocation"
              name="allocation"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              defaultValue={initialAllocation ?? ""}
            >
              <option value="" disabled>
                Select your allocation
              </option>
              {allocationChoices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-brand-muted mt-1">
              Must match the allocation assigned to your account for this conference.
            </p>
            {initialAllocation ? (
              <p className="text-xs text-brand-navy/80 mt-1">
                Preselected from your sign-up link.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          Committee password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="off"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          placeholder="Provided by your chair"
        />
      </div>

      {state?.error && (
        <p
          id="committee-gate-error"
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
        className="w-full py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50"
      >
        {pending ? "Verifying…" : "Continue to platform"}
      </button>

      <p className="text-center text-sm text-brand-muted">
        <Link href="/login" className="text-brand-gold hover:underline">
          Use a different account
        </Link>
      </p>
    </form>
  );
}
