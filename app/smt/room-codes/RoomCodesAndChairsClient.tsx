"use client";

import { useActionState } from "react";
import {
  smtInviteChairAction,
  smtPromoteToChairByEmailAction,
  smtSetCommitteeCodeOnlyAction,
  type StaffAccessFormState,
} from "@/app/actions/smtStaffAccess";

type Conf = { id: string; name: string; committee: string | null; committee_code: string | null };

function CommitteeCodeRowForm({ c }: { c: Conf }) {
  const [state, action, pending] = useActionState(smtSetCommitteeCodeOnlyAction, null);
  const label = [c.name, c.committee].filter(Boolean).join(" — ");
  const current = c.committee_code?.trim() || "—";

  return (
    <form action={action} className="rounded-xl border border-brand-navy/10 p-4 bg-brand-cream/20 space-y-2">
      <input type="hidden" name="conference_id" value={c.id} />
      <p className="text-sm font-medium text-brand-navy">{label}</p>
      <p className="text-xs text-brand-muted">
        Current: <span className="font-mono text-brand-navy">{current}</span>
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-brand-muted mb-1">New committee code</label>
          <input
            name="code"
            required
            minLength={6}
            maxLength={6}
            pattern="[A-Za-z0-9]{6}"
            title="Exactly 6 letters or digits"
            defaultValue={c.committee_code ?? ""}
            placeholder="e.g. DIS795"
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy placeholder:text-brand-muted/70 font-mono text-sm uppercase tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50 border border-brand-navy/20"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error ? (
        <p className="text-xs text-red-700">{state.error}</p>
      ) : state?.success ? (
        <p className="text-xs text-brand-navy">{state.success}</p>
      ) : null}
    </form>
  );
}

function Flash({ state }: { state: StaffAccessFormState | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      className={`text-sm rounded-lg px-3 py-2 ${
        state.error
          ? "bg-red-50 text-red-800 border border-red-100"
          : "bg-brand-accent/10 text-brand-navy border border-brand-accent/22"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

export function RoomCodesAndChairsClient({
  conferences,
  adminInviteConfigured,
}: {
  conferences: Conf[];
  adminInviteConfigured: boolean;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(smtInviteChairAction, null);
  const [promoteState, promoteAction, promotePending] = useActionState(
    smtPromoteToChairByEmailAction,
    null
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">
          Committee / room codes
        </h2>
        <p className="text-sm text-brand-muted mb-6 max-w-2xl">
          Same value is used for the <strong>second gate</strong> (committee code) and the chair room
          join flow—unique within this event. Delegates enter it after the conference code.
        </p>

        {conferences.length === 0 ? (
          <p className="text-sm text-brand-muted">No committees for this event yet.</p>
        ) : (
          <div className="space-y-4">
            {conferences.map((c) => (
              <CommitteeCodeRowForm key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">Invite dais chairs</h2>
        <p className="text-sm text-brand-muted mb-4 max-w-2xl">
          Sends a Supabase magic link so they can set a password. Their profile is set to{" "}
          <strong>chair</strong> as soon as the invite is created. Configure the{" "}
          <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span> server env variable and
          allow your sign-in URL (e.g. <span className="font-mono text-xs">…/login</span>) under
          Authentication → URL configuration → Redirect URLs.
        </p>

        {!adminInviteConfigured ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Invites are disabled until <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> is
            set on this deployment.
          </p>
        ) : (
          <form action={inviteAction} className="max-w-md space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
                placeholder="chair@school.edu"
              />
            </div>
            <Flash state={inviteState} />
            <button
              type="submit"
              disabled={invitePending}
              className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
            >
              {invitePending ? "Sending…" : "Send chair invite"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">
          Grant chair role (existing account)
        </h2>
        <p className="text-sm text-brand-muted mb-4 max-w-2xl">
          If they already signed up as a delegate, promote them here so they get the chair dashboard and
          committee tools (no email sent).
        </p>
        <form action={promoteAction} className="max-w-md space-y-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              placeholder="chair@school.edu"
            />
          </div>
          <Flash state={promoteState} />
          <button
            type="submit"
            disabled={promotePending}
            className="px-4 py-2 rounded-lg border border-brand-navy/25 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
          >
            {promotePending ? "Saving…" : "Grant chair role"}
          </button>
        </form>
      </section>
    </div>
  );
}
