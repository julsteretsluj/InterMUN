"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { joinEventByCode } from "@/app/actions/eventGate";

type Props = {
  /** After success: usually `/room-gate?next=...` */
  roomGateNext: string;
};

export function EventGateForm({ roomGateNext }: Props) {
  const [state, formAction, pending] = useActionState(joinEventByCode, null);

  useEffect(() => {
    if (state?.error) {
      document.getElementById("event-gate-error")?.focus();
    }
  }, [state?.error]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={roomGateNext} />

      <div>
        <label
          htmlFor="event_code"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          Conference code
        </label>
        <input
          id="event_code"
          name="event_code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          required
          minLength={4}
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy font-mono tracking-wide text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          placeholder="e.g. SEAMUNI2027"
        />
        <p className="text-xs text-brand-muted mt-1.5">
          First step: the code for the whole conference (all committees). Spaces are ignored;
          matching is case-insensitive.
        </p>
      </div>

      {state?.error && (
        <p
          id="event-gate-error"
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
        {pending ? "Continuing…" : "Continue to committee step"}
      </button>

      <p className="text-center text-sm text-brand-muted">
        <Link href="/login" className="text-brand-gold hover:underline">
          Use a different account
        </Link>
      </p>
    </form>
  );
}
