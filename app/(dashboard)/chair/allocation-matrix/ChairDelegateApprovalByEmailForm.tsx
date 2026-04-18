"use client";

import { useActionState } from "react";
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
  const [state, formAction, pending] = useActionState(chairAssignDelegateByEmailAction, INITIAL_STATE);

  return (
    <section className="mt-6 rounded-lg border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy">
          Accept delegate by email + allocation
        </h2>
        <HelpButton title="Accept delegate">
          Use this to directly assign a user account (by email) to a specific allocation in this conference.
        </HelpButton>
      </div>
      <p className="text-xs text-brand-muted mt-1 mb-3">
        Chairs can directly approve a delegate account to a specific allocation.
      </p>

      <form action={formAction} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <input type="hidden" name="conference_id" value={conferenceId} />
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs text-brand-muted">Delegate email</label>
            <HelpButton title="Delegate email">
              Enter the exact account email the delegate uses to sign in.
            </HelpButton>
          </div>
          <input
            type="email"
            name="email"
            required
            placeholder="delegate@email.com"
            className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs text-brand-muted">Allocation</label>
            <HelpButton title="Allocation">
              Choose which country/seat to assign. “Currently assigned” means another user is already linked there.
            </HelpButton>
          </div>
          <select
            name="allocation_id"
            required
            className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select allocation
            </option>
            {allocationOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.country}
                {opt.user_id ? " (currently assigned)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-brand-gold text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Accepting..." : "Accept delegate"}
        </button>
      </form>

      {state?.error ? (
        <p className="mt-3 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-3 text-sm rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
          Delegate accepted and allocation updated.
        </p>
      ) : null}
    </section>
  );
}
