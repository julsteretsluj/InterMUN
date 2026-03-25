"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { joinRoomByCode } from "@/app/actions/roomGate";

type Props = {
  nextPath: string;
  showChairSetupLink: boolean;
};

export function RoomGateForm({ nextPath, showChairSetupLink }: Props) {
  const [state, formAction, pending] = useActionState(joinRoomByCode, null);

  useEffect(() => {
    if (state?.error) {
      document.getElementById("room-gate-error")?.focus();
    }
  }, [state?.error]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label
          htmlFor="code"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          Committee room code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          placeholder="e.g. ECO7K2"
        />
        <p className="text-xs text-brand-muted mt-1.5">
          Case-insensitive. Your chair publishes this code for your committee.
        </p>
      </div>

      {state?.error && (
        <p
          id="room-gate-error"
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
        className="w-full py-3 rounded-lg bg-brand-navy text-brand-paper font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50"
      >
        {pending ? "Joining…" : "Join committee"}
      </button>

      {showChairSetupLink && (
        <p className="text-center text-sm text-brand-muted">
          Chair or SMT?{" "}
          <Link href="/chair/room-code" className="text-brand-gold font-medium hover:underline">
            Set room code
          </Link>
        </p>
      )}

      <p className="text-center text-sm text-brand-muted">
        <Link href="/login" className="text-brand-gold hover:underline">
          Use a different account
        </Link>
      </p>
    </form>
  );
}
