"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createConferenceAsStaff } from "@/app/actions/conferenceSetup";

type Props = { nextPath: string };

export function ConferenceSetupForm({ nextPath }: Props) {
  const t = useTranslations("conferenceSetupForm");
  const [state, formAction, pending] = useActionState(
    createConferenceAsStaff,
    null as { error?: string } | null
  );

  useEffect(() => {
    if (state?.error) {
      document.getElementById("conference-setup-error")?.focus();
    }
  }, [state?.error]);

  const committeeOptions = [
    "African Union",
    "Arab League",
    "ASEAN",
    "CCPCJ",
    "DISEC",
    "ECOFIN",
    "ECOSOC",
    "EU",
    "F1",
    "FIFA",
    "Fantasy World Committee",
    "HSC",
    "HRC",
    "HCR",
    "IAEA",
    "ICAO",
    "ICC",
    "ICJ",
    "Interpol",
    "IOPC",
    "NATO",
    "Press Corps",
    "US Senate",
    "SOCHUM",
    "SPECPOL",
    "CSA",
    "UNDP",
    "UNEP",
    "UNESCO",
    "UNICEF",
    "UNODC",
    "UNSC",
    "WHO",
    "WIPO",
    "WTO",
  ];

  return (
    <form action={formAction} className="space-y-5 text-left">
      <input type="hidden" name="next" value={nextPath} />

      <div className="rounded-lg border border-brand-accent/30 bg-brand-cream/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy">{t("sectionConference")}</p>

        <div>
          <label
            htmlFor="event-name"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("eventNameLabel")} <span className="text-red-600">*</span>
          </label>
          <input
            id="event-name"
            name="event_name"
            type="text"
            required
            minLength={2}
            autoComplete="organization"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("eventNamePlaceholder")}
          />
          <p className="text-xs text-brand-muted mt-1">{t("eventNameHelp")}</p>
        </div>

        <div>
          <label
            htmlFor="event-code"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("eventCodeLabel")} <span className="text-red-600">*</span>
          </label>
          <input
            id="event-code"
            name="event_code"
            type="text"
            required
            minLength={4}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy font-mono focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("eventCodePlaceholder")}
          />
          <p className="text-xs text-brand-muted mt-1">{t("eventCodeHelp")}</p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-navy/15 bg-black/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy">{t("sectionFirstCommittee")}</p>

        <div>
          <label
            htmlFor="session-name"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("sessionNameLabel")} <span className="text-red-600">*</span>
          </label>
          <input
            id="session-name"
            name="session_name"
            type="text"
            required
            minLength={2}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("sessionNamePlaceholder")}
          />
          <p className="text-xs text-brand-muted mt-1">{t("sessionNameHelp")}</p>
        </div>

        <div>
          <label
            htmlFor="conf-committee"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("committeeLabel")}
          </label>
          <input
            id="conf-committee"
            name="committee"
            type="text"
            autoComplete="off"
            list="committee-suggestions"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("committeePlaceholder")}
          />
          <datalist id="committee-suggestions">
            {committeeOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="text-xs text-brand-muted mt-1">{t("committeeHelp")}</p>
        </div>

        <div>
          <label
            htmlFor="conf-tagline"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("taglineLabel")}
          </label>
          <input
            id="conf-tagline"
            name="tagline"
            type="text"
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("taglinePlaceholder")}
          />
        </div>

        <div>
          <label
            htmlFor="committee-code"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("committeeCodeLabel")} <span className="text-red-600">*</span>
          </label>
          <input
            id="committee-code"
            name="committee_code"
            type="text"
            required
            minLength={6}
            maxLength={6}
            pattern="[A-Za-z0-9]{6}"
            title={t("committeeCodeTitle")}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("committeeCodePlaceholder")}
          />
          <p className="text-xs text-brand-muted mt-1">{t("committeeCodeHelp")}</p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-navy/10 bg-brand-cream/40 p-4 space-y-4">
        <p className="text-xs font-medium text-brand-navy">{t("sectionPassword")}</p>
        <p className="text-xs text-brand-muted">{t("passwordIntro")}</p>
        <div>
          <label
            htmlFor="conf-pw"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("committeePasswordLabel")}
          </label>
          <input
            id="conf-pw"
            name="committee_password"
            type="password"
            autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("committeePasswordPlaceholder")}
          />
        </div>
        <div>
          <label
            htmlFor="conf-pw2"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            {t("committeePasswordConfirmLabel")}
          </label>
          <input
            id="conf-pw2"
            name="committee_password_confirm"
            type="password"
            autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            placeholder={t("committeePasswordConfirmPlaceholder")}
          />
        </div>
      </div>

      {state?.error && (
        <p
          id="conference-setup-error"
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
        className="w-full py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50"
      >
        {pending ? t("creating") : t("submit")}
      </button>
    </form>
  );
}
