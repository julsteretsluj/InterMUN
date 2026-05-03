"use client";

import { useActionState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  smtInviteChairAction,
  smtPromoteToChairByEmailAction,
  smtSetCommitteeCodeOnlyAction,
  type StaffAccessFormState,
} from "@/app/actions/smtStaffAccess";
import { compareCommitteeRowsByDifficultyThenLabel } from "@/lib/committee-difficulty-sort";
import { getDaisSeatLabelsForCommittee } from "@/lib/dais-seat-plan";
import { committeeSessionGroupKey } from "@/lib/committee-session-group";
import { translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";

type Conf = { id: string; name: string; committee: string | null; committee_code: string | null };

/** One room-code card per chamber; `set_conference_room_code` syncs all topic rows in that chamber. */
function clusterByChamber(conferences: Conf[]): Conf[][] {
  const map = new Map<string, Conf[]>();
  for (const c of conferences) {
    const g = committeeSessionGroupKey(c.committee);
    const key = g ?? `__single:${c.id}`;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return [...map.values()]
    .map((group) =>
      group.slice().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }))
    )
    .sort((a, b) => compareCommitteeRowsByDifficultyThenLabel(a[0]!, b[0]!));
}

function CommitteeCodeRowForm({ group }: { group: Conf[] }) {
  const c = group[0]!;
  const t = useTranslations("smtRoomCodesClient");
  const tSetup = useTranslations("conferenceSetupForm");
  const tCommon = useTranslations("common");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const [state, action, pending] = useActionState(smtSetCommitteeCodeOnlyAction, null);

  const comm = c.committee?.trim();
  const label = comm
    ? translateCommitteeLabel(tCommitteeLabels, comm)
    : t("chamberLabelFallback");

  const current = c.committee_code?.trim() || t("dash");

  return (
    <form action={action} className="rounded-xl border border-brand-navy/10 p-4 bg-brand-cream/20 space-y-2">
      <input type="hidden" name="conference_id" value={c.id} />
      <p className="text-sm font-medium text-brand-navy">{label}</p>
      <p className="text-xs text-brand-muted">
        {t("currentCode")} <span className="font-mono text-brand-navy">{current}</span>
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-brand-muted mb-1">{t("newCommitteeCode")}</label>
          <input
            name="code"
            required
            minLength={6}
            maxLength={6}
            pattern="[A-Za-z0-9]{6}"
            title={tSetup("committeeCodeTitle")}
            defaultValue={c.committee_code ?? ""}
            placeholder={t("committeeCodePlaceholder")}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy placeholder:text-brand-muted/70 font-mono text-sm uppercase tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50 border border-brand-navy/20"
        >
          {pending ? t("saving") : tCommon("save")}
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
  const t = useTranslations("smtRoomCodesClient");
  const tCommon = useTranslations("common");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const chairRoleOptions = useMemo(
    () =>
      clusterByChamber(conferences).flatMap((group) => {
        const c = group[0]!;
        const comm = c.committee?.trim();
        const chamberTitle = comm
          ? translateCommitteeLabel(tCommitteeLabels, comm)
          : t("chamberLabelFallback");
        const seats = [...getDaisSeatLabelsForCommittee(c.committee)];
        return seats.map((seat) => ({
          value: `${c.id}::${encodeURIComponent(seat)}`,
          label: t("chairInviteOption", { seat, committee: chamberTitle }),
        }));
      }),
    [conferences, t, tCommitteeLabels]
  );
  const [inviteState, inviteAction, invitePending] = useActionState(smtInviteChairAction, null);
  const [promoteState, promoteAction, promotePending] = useActionState(
    smtPromoteToChairByEmailAction,
    null
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">
          {t("committeeRoomCodes")}
        </h2>
        <p className="text-sm text-brand-muted mb-6 max-w-2xl">
          {t.rich("committeeCodesHelp", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>

        {conferences.length === 0 ? (
          <p className="text-sm text-brand-muted">{t("noCommitteesYet")}</p>
        ) : (
          <div className="space-y-4">
            {clusterByChamber(conferences).map((group) => (
              <CommitteeCodeRowForm key={group[0]!.id} group={group} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">{t("inviteDaisChairs")}</h2>
        <p className="text-sm text-brand-muted mb-4 max-w-2xl">
          {t.rich("inviteHelp", {
            strong: (chunks) => <strong>{chunks}</strong>,
            code: (chunks) => <span className="font-mono text-xs">{chunks}</span>,
          })}
        </p>

        {!adminInviteConfigured ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t.rich("inviteDisabled", {
              code: (chunks) => <span className="font-mono">{chunks}</span>,
            })}
          </p>
        ) : conferences.length === 0 ? (
          <p className="text-sm text-brand-muted">{t("noCommitteesYet")}</p>
        ) : (
          <form action={inviteAction} className="max-w-md space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
                {t("chairRoleLabel")}
              </label>
              <select
                name="chair_role"
                required
                defaultValue=""
                className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 bg-white dark:bg-discord-elevated text-brand-navy text-sm"
              >
                <option value="" disabled>
                  {t("chairRolePlaceholder")}
                </option>
                {chairRoleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
                {t("email")}
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
                placeholder={t("chairEmailPlaceholder")}
              />
            </div>
            <Flash state={inviteState} />
            <button
              type="submit"
              disabled={invitePending || chairRoleOptions.length === 0}
              className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
            >
              {invitePending ? t("sending") : t("sendChairInvite")}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-brand-navy mb-2">
          {t("grantChairRoleTitle")}
        </h2>
        <p className="text-sm text-brand-muted mb-4 max-w-2xl">
          {t("grantChairRoleHelp")}
        </p>
        <form action={promoteAction} className="max-w-md space-y-3">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
              {t("email")}
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              placeholder={t("chairEmailPlaceholder")}
            />
          </div>
          <Flash state={promoteState} />
          <button
            type="submit"
            disabled={promotePending}
            className="px-4 py-2 rounded-lg border border-brand-navy/25 text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
          >
            {promotePending ? t("saving") : t("grantChairRole")}
          </button>
        </form>
      </section>
    </div>
  );
}
