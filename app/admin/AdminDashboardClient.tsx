"use client";

import { useActionState } from "react";
import Link from "next/link";
import { adminInviteSmtAction, adminSetProfileRoleAction, type AdminUserFormState } from "@/app/actions/adminUsers";

function Flash({ state }: { state: AdminUserFormState | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      className={`text-sm rounded-lg px-3 py-2 ${
        state.error
          ? "bg-red-950/50 text-red-200 border border-red-900/50"
          : "bg-emerald-950/40 text-emerald-100 border border-emerald-900/50"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

export function AdminDashboardClient({
  adminInviteConfigured,
}: {
  adminInviteConfigured: boolean;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(adminInviteSmtAction, null);
  const [roleState, roleAction, rolePending] = useActionState(adminSetProfileRoleAction, null);

  return (
    <div className="space-y-10">
      <section className="mun-shell !shadow-none">
        <h2 className="mb-2 font-display text-lg font-semibold text-brand-navy">New conference event</h2>
        <p className="mb-4 max-w-2xl text-sm text-brand-muted">
          Creates a conference code (first gate) and the first committee session (second gate). Use{" "}
          <span className="font-mono text-xs">next=/admin</span> so you return here after setup.
        </p>
        <Link
          href="/conference-setup?next=%2Fadmin"
          className="inline-flex rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
        >
          Open conference setup
        </Link>
      </section>

      <section className="mun-shell !shadow-none space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Secretariat (SMT)</h2>
        <p className="max-w-2xl text-sm text-brand-muted">
          Invite new SMT accounts by email, or change an existing user to delegate, chair, or SMT.
          Promoting someone to SMT lets them use the full secretariat dashboard during the event.
        </p>

        {!adminInviteConfigured ? (
          <p className="text-sm text-amber-200/90 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2">
            Email invites need <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> on the server.
            You can still use <strong>Set role</strong> for users who already signed up.
          </p>
        ) : (
          <form action={inviteAction} className="max-w-md space-y-3">
            <div>
              <label className="mun-label mb-2 block normal-case">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mun-field"
                placeholder="smt@school.edu"
              />
            </div>
            <Flash state={inviteState} />
            <button
              type="submit"
              disabled={invitePending}
              className="mun-btn-primary disabled:opacity-50"
            >
              {invitePending ? "Sending…" : "Invite as SMT"}
            </button>
          </form>
        )}

        <form action={roleAction} className="max-w-md space-y-3 border-t border-white/10 pt-4">
          <h3 className="text-sm font-medium text-brand-navy">Set role on existing account</h3>
          <div>
            <label className="mun-label mb-2 block normal-case">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mun-field"
              placeholder="user@school.edu"
            />
          </div>
          <div>
            <label className="mun-label mb-2 block normal-case">Role</label>
            <select name="role" required className="mun-field">
              <option value="delegate">Delegate</option>
              <option value="chair">Chair</option>
              <option value="smt">SMT (secretariat)</option>
            </select>
          </div>
          <Flash state={roleState} />
          <button
            type="submit"
            disabled={rolePending}
            className="mun-btn disabled:opacity-50"
          >
            {rolePending ? "Saving…" : "Save role"}
          </button>
        </form>
      </section>
    </div>
  );
}
