"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";
import { setRoomCodeAndEnterAction, switchCommitteeContextAction } from "@/app/actions/roomGate";
import { HelpButton } from "@/components/HelpButton";

type Conf = {
  id: string;
  name: string;
  committee: string | null;
  room_code: string | null;
  committee_code: string | null;
};

export function RoomCodeChairForm({ conferences }: { conferences: Conf[] }) {
  const t = useTranslations("roomCodeChairForm");
  const tCommon = useTranslations("common");
  const tSetup = useTranslations("conferenceSetupForm");
  const tTopics = useTranslations("agendaTopics");
  const tCommitteeLabels = useTranslations("committeeNames.labels");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [conferenceId, setConferenceId] = useState(conferences[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(setRoomCodeAndEnterAction, null);
  const [switchState, switchAction, switchPending] = useActionState(switchCommitteeContextAction, null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conferences;
    return conferences.filter((c) => {
      const hay = [c.name, c.committee].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [conferences, query]);

  useEffect(() => {
    if (conferences.length === 0) return;
    if (filtered.some((c) => c.id === conferenceId)) return;
    setConferenceId(filtered[0]?.id ?? conferences[0]?.id ?? "");
  }, [filtered, conferenceId, conferences]);

  const selected = conferences.find((c) => c.id === conferenceId);

  const fieldClass =
    "w-full px-3 py-2.5 rounded-lg border border-white/20 bg-black/25 text-brand-navy shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent";

  const singleCommittee = conferences.length === 1;
  const showSearch = conferences.length > 1;

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <input type="hidden" name="next" value="/profile" />

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{t("committeeSelection")}</p>
          <HelpButton title={t("committeeCodeSetupTitle")}>
            {t("committeeCodeSetupHelp")}
          </HelpButton>
        </div>
        {singleCommittee ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
              {tCommon("committee")}
            </p>
            <p className="text-sm text-brand-navy font-medium leading-snug">
              {translateConferenceHeadline(
                tTopics,
                tCommitteeLabels,
                [conferences[0].name, conferences[0].committee].filter(Boolean).join(" — "),
                locale
              )}
            </p>
            <input type="hidden" name="conference_id" value={conferences[0].id} />
          </>
        ) : (
          <>
            {showSearch ? (
              <div className="mb-3">
                <label
                  htmlFor="committee-search"
                  className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
                >
                  {t("findCommittee")}
                </label>
                <input
                  id="committee-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className={`${fieldClass} placeholder:text-brand-muted/70`}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
              {tCommon("conference")}
            </label>
            <select
              name="conference_id"
              value={conferenceId}
              onChange={(e) => setConferenceId(e.target.value)}
              required
              className={fieldClass}
            >
              {filtered.length === 0 ? (
                <option value="">{t("noMatches")}</option>
              ) : (
                filtered.map((c) => (
                  <option key={c.id} value={c.id}>
                    {translateConferenceHeadline(
                      tTopics,
                      tCommitteeLabels,
                      [c.name, c.committee].filter(Boolean).join(" — "),
                      locale
                    )}
                  </option>
                ))
              )}
            </select>
          </>
        )}
        {(selected?.committee_code || selected?.room_code) && (
          <p className="text-xs text-brand-muted mt-2">
            {t("currentCommitteeCode")}{" "}
            <span className="font-mono font-semibold text-brand-accent-bright tabular-nums">
              {selected.committee_code ?? selected.room_code}
            </span>
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label
            htmlFor="chair-room-code"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted"
          >
            {t("newCommitteeCode")}
          </label>
          <HelpButton title={t("newCommitteeCode")}>
            {t("newCommitteeCodeHelp")}
          </HelpButton>
        </div>
        <input
          id="chair-room-code"
          name="code"
          type="text"
          required
          minLength={6}
          maxLength={6}
          pattern="[A-Za-z0-9]{6}"
          title={tSetup("committeeCodeTitle")}
          autoComplete="off"
          className={`${fieldClass} font-mono uppercase tracking-widest placeholder:text-brand-muted/70`}
          placeholder={t("committeeCodePlaceholder")}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-900 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {switchState?.error && (
        <p className="text-sm text-red-900 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
          {switchState.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          formAction={switchAction}
          type="submit"
          disabled={
            switchPending ||
            conferences.length === 0 ||
            (!singleCommittee && (filtered.length === 0 || !conferenceId))
          }
          className="px-4 py-2.5 rounded-lg border border-brand-navy/25 bg-white/70 text-brand-navy font-semibold hover:bg-white disabled:opacity-50"
        >
          {switchPending ? t("switching") : t("switchToSelectedCommittee")}
        </button>
        <button
          type="submit"
          disabled={
            pending ||
            conferences.length === 0 ||
            (!singleCommittee && (filtered.length === 0 || !conferenceId))
          }
          className="px-4 py-2.5 rounded-lg bg-brand-accent text-white font-semibold hover:opacity-90 disabled:opacity-50 border border-brand-navy/15"
        >
          {pending ? t("saving") : t("saveCodeGoToProfile")}
        </button>
      </div>
    </form>
  );
}
