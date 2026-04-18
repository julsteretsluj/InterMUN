"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { verifyAllocationCodeGate } from "@/app/actions/allocationCodeGate";

export function AllocationCodeGateForm({
  conferenceId,
  conferenceTitle,
  seatLabel,
  nextPath,
}: {
  conferenceId: string;
  conferenceTitle: string;
  seatLabel: string;
  nextPath: string;
}) {
  const [state, formAction, pending] = useActionState(
    verifyAllocationCodeGate,
    null as { error?: string } | null
  );

  useEffect(() => {
    if (state?.error) {
      document.getElementById("allocation-code-gate-error")?.focus();
    }
  }, [state?.error]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="conference_id" value={conferenceId} />
      <input type="hidden" name="next" value={nextPath} />

      <div className="rounded-lg border border-brand-navy/10 bg-brand-cream/50 px-3 py-2 text-sm text-brand-muted">
        <span className="font-medium text-brand-navy">Committee: </span>
        {conferenceTitle}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">Your seat</p>
        <p className="text-sm font-medium text-brand-navy py-2 px-3 rounded-lg border border-brand-navy/15 bg-black/25">
          {seatLabel}
        </p>
      </div>

      <div>
        <label
          htmlFor="placard-code"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          Placard / sign-in code
        </label>
        <input
          id="placard-code"
          name="code"
          type="text"
          autoComplete="off"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          placeholder="From your chair (Sign-in passwords list)"
        />
        <p className="text-xs text-brand-muted mt-1">
          This code is unique to your seat. Only one account can complete this step per seat — if you share an
          account, use that same login.
        </p>
      </div>

      {state?.error && (
        <p
          id="allocation-code-gate-error"
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
        {pending ? "Verifying…" : "Continue"}
      </button>

      <p className="text-center text-sm text-brand-muted">
        <Link href="/login" className="text-brand-accent hover:underline">
          Use a different account
        </Link>
      </p>
    </form>
  );
}
