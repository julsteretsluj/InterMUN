"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  setCommitteePasswordAction,
  removeCommitteePasswordAction,
  type CommitteePasswordFormState,
} from "@/app/actions/committeeGate";

type Conf = {
  id: string;
  name: string;
  committee: string | null;
  committee_password_hash: string | null;
};

export function CommitteeAccessForm({ conferences }: { conferences: Conf[] }) {
  const [setState, setAction, setPending] = useActionState(
    setCommitteePasswordAction,
    null as CommitteePasswordFormState | null
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeCommitteePasswordAction,
    null as CommitteePasswordFormState | null
  );

  const setFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (setState?.success) {
      setFormRef.current?.reset();
    }
  }, [setState?.success]);

  if (conferences.length === 0) {
    return <p className="text-sm text-brand-muted">No conferences in the database yet.</p>;
  }

  return (
    <div className="space-y-10 max-w-lg">
      <div>
        <h3 className="font-display text-lg font-semibold text-brand-navy mb-3">
          Set or change password
        </h3>
        <form ref={setFormRef} action={setAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
              Conference
            </label>
            <select
              name="conference_id"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white"
              defaultValue=""
            >
              <option value="" disabled>
                Select conference
              </option>
              {conferences.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.committee ? ` — ${c.committee}` : ""}
                  {c.committee_password_hash ? " (password set)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
              New committee password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
              Confirm password
            </label>
            <input
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white"
            />
          </div>
          {setState?.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {setState.error}
            </p>
          )}
          {setState?.success && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Committee password saved. Delegates will need it on next visit.
            </p>
          )}
          <button
            type="submit"
            disabled={setPending}
            className="px-4 py-2.5 rounded-lg bg-brand-navy text-brand-paper font-medium disabled:opacity-50"
          >
            {setPending ? "Saving…" : "Save committee password"}
          </button>
        </form>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold text-brand-navy mb-3">
          Remove password (disable secondary sign-in)
        </h3>
        <form action={removeAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
              Conference
            </label>
            <select
              name="conference_id"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white"
              defaultValue=""
            >
              <option value="" disabled>
                Select conference
              </option>
              {conferences.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.committee ? ` — ${c.committee}` : ""}
                </option>
              ))}
            </select>
          </div>
          {removeState?.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {removeState.error}
            </p>
          )}
          {removeState?.success && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Committee password removed. Delegates will no longer see the extra step.
            </p>
          )}
          <button
            type="submit"
            disabled={removePending}
            className="px-4 py-2.5 rounded-lg border-2 border-red-800/30 text-red-900 font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {removePending ? "Removing…" : "Remove committee password"}
          </button>
        </form>
      </div>
    </div>
  );
}
