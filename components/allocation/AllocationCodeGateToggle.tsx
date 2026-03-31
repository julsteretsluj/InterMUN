"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setAllocationCodeGateEnabledAction,
  type AllocationGateToggleState,
} from "@/app/actions/allocationCodeGate";

export function AllocationCodeGateToggle({
  conferenceId,
  enabled,
}: {
  conferenceId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    setAllocationCodeGateEnabledAction,
    null as AllocationGateToggleState | null
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <form action={action} className="rounded-xl border border-brand-navy/15 bg-brand-cream/30 p-4 space-y-3">
      <input type="hidden" name="conference_id" value={conferenceId} />
      <p className="text-sm font-medium text-brand-navy">Third gate (allocation)</p>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-brand-navy">
        <input
          type="checkbox"
          name="gate_enabled"
          value="on"
          defaultChecked={enabled}
          className="mt-1 h-4 w-4 rounded border-brand-navy/30"
        />
        <span>
          Require <strong>placard / sign-in code</strong> after committee sign-in. Delegates and chairs must enter
          the code listed below for their seat.{" "}
          <span className="text-brand-muted">Turning this off clears active seat verifications.</span>
        </span>
      </label>
      {state?.error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">Saved.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="text-sm px-3 py-1.5 rounded-lg bg-brand-gold text-white font-medium disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save gate setting"}
      </button>
    </form>
  );
}
