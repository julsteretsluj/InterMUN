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
      <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5 md:p-6">
        <h2 className="font-display text-lg font-semibold text-white mb-2">New conference event</h2>
        <p className="text-sm text-slate-300 mb-4 max-w-2xl">
          Creates a conference code (first gate) and the first committee session (second gate). Use{" "}
          <span className="font-mono text-xs">next=/admin</span> so you return here after setup.
        </p>
        <Link
          href="/conference-setup?next=%2Fadmin"
          className="inline-flex px-4 py-2 rounded-lg bg-amber-400 text-slate-900 text-sm font-medium hover:bg-amber-300"
        >
          Open conference setup
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Secretariat (SMT)</h2>
        <p className="text-sm text-slate-300 max-w-2xl">
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
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-950 text-white placeholder:text-slate-500"
                placeholder="smt@school.edu"
              />
            </div>
            <Flash state={inviteState} />
            <button
              type="submit"
              disabled={invitePending}
              className="px-4 py-2 rounded-lg bg-amber-400 text-slate-900 text-sm font-medium disabled:opacity-50"
            >
              {invitePending ? "Sending…" : "Invite as SMT"}
            </button>
          </form>
        )}

        <form action={roleAction} className="max-w-md space-y-3 pt-4 border-t border-slate-700">
          <h3 className="text-sm font-medium text-white">Set role on existing account</h3>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-950 text-white"
              placeholder="user@school.edu"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
              Role
            </label>
            <select
              name="role"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-950 text-white"
            >
              <option value="delegate">Delegate</option>
              <option value="chair">Chair</option>
              <option value="smt">SMT (secretariat)</option>
            </select>
          </div>
          <Flash state={roleState} />
          <button
            type="submit"
            disabled={rolePending}
            className="px-4 py-2 rounded-lg border border-slate-500 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {rolePending ? "Saving…" : "Save role"}
          </button>
        </form>
      </section>
    </div>
  );
}
