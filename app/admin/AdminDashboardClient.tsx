"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { adminInviteSmtAction, adminSetProfileRoleAction, type AdminUserFormState } from "@/app/actions/adminUsers";

function Flash({ state }: { state: AdminUserFormState | null }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      className={`text-sm rounded-lg px-3 py-2 ${
        state.error
          ? "bg-red-950/50 text-red-200 border border-red-900/50"
          : "bg-brand-accent/14 text-brand-accent-bright border border-brand-accent/45"
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
  const t = useTranslations("adminDashboard");
  const [inviteState, inviteAction, invitePending] = useActionState(adminInviteSmtAction, null);
  const [roleState, roleAction, rolePending] = useActionState(adminSetProfileRoleAction, null);

  return (
    <div className="space-y-10">
      <section className="mun-shell !shadow-none">
        <h2 className="mb-2 font-display text-lg font-semibold text-brand-navy">{t("newEventTitle")}</h2>
        <p className="mb-4 max-w-2xl text-sm text-brand-muted">
          {t.rich("newEventBody", {
            code: (chunks) => <span className="font-mono text-xs">{chunks}</span>,
          })}
        </p>
        <Link
          href="/conference-setup?next=%2Fadmin"
          className="inline-flex rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
        >
          {t("openConferenceSetup")}
        </Link>
      </section>

      <section className="mun-shell !shadow-none space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("smtTitle")}</h2>
        <p className="max-w-2xl text-sm text-brand-muted">{t("smtBody")}</p>

        {!adminInviteConfigured ? (
          <p className="text-sm text-amber-200/90 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2">
            {t.rich("inviteNeedsKey", {
              code: (chunks) => <span className="font-mono">{chunks}</span>,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        ) : (
          <form action={inviteAction} className="max-w-md space-y-3">
            <div>
              <label className="mun-label mb-2 block normal-case">{t("emailLabel")}</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mun-field"
                placeholder={t("emailPlaceholderSmt")}
              />
            </div>
            <Flash state={inviteState} />
            <button
              type="submit"
              disabled={invitePending}
              className="mun-btn-primary disabled:opacity-50"
            >
              {invitePending ? t("inviteSending") : t("inviteSubmit")}
            </button>
          </form>
        )}

        <form action={roleAction} className="max-w-md space-y-3 border-t border-white/10 pt-4">
          <h3 className="text-sm font-medium text-brand-navy">{t("setRoleTitle")}</h3>
          <div>
            <label className="mun-label mb-2 block normal-case">{t("emailLabel")}</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mun-field"
              placeholder={t("emailPlaceholderUser")}
            />
          </div>
          <div>
            <label className="mun-label mb-2 block normal-case">{t("roleLabel")}</label>
            <select name="role" required className="mun-field">
              <option value="delegate">{t("roleDelegate")}</option>
              <option value="chair">{t("roleChair")}</option>
              <option value="smt">{t("roleSmt")}</option>
            </select>
          </div>
          <Flash state={roleState} />
          <button
            type="submit"
            disabled={rolePending}
            className="mun-btn disabled:opacity-50"
          >
            {rolePending ? t("roleSaving") : t("roleSave")}
          </button>
        </form>
      </section>
    </div>
  );
}
