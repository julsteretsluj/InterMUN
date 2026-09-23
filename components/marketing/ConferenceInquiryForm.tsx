// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  submitConferenceInquiryAction,
  type ConferenceInquiryState,
} from "@/app/actions/conferenceInquiry";
import { getPartnershipContactEmail } from "@/lib/branding";
import { cn } from "@/lib/utils";

const INITIAL_STATE: ConferenceInquiryState | null = null;

const INPUT_CLASS =
  "mt-1.5 w-full rounded-[var(--clicky-radius-sm)] border border-[var(--clicky-line)] bg-white px-3 py-2.5 text-[0.9375rem] text-[var(--clicky-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--clicky-muted)] focus:border-[var(--clicky-blue)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.18)] [color-scheme:light]";

const LABEL_CLASS =
  "block text-[0.6875rem] font-semibold tracking-[0.08em] text-[var(--clicky-muted)]";

export function ConferenceInquiryForm({ className }: { className?: string }) {
  const t = useTranslations("marketing.contact.form");
  const partnershipEmail = getPartnershipContactEmail();
  const [state, formAction, pending] = useActionState(submitConferenceInquiryAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  const interests = [
    { value: "setup", label: t("interestSetup") },
    { value: "branding", label: t("interestBranding") },
    { value: "custom_committees", label: t("interestCustomCommittees") },
    { value: "training", label: t("interestTraining") },
    { value: "demo", label: t("interestDemo") },
  ] as const;

  return (
    <div className={cn("clicky-window overflow-hidden text-left", className)}>
      <div className="clicky-window-bar">
        <span className="clicky-traffic" aria-hidden />
        <span className="clicky-window-title">inquiry.form</span>
      </div>
      <form ref={formRef} action={formAction} className="relative space-y-5 bg-[var(--clicky-window)] p-5 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="inquiry-organization" className={LABEL_CLASS}>
              {t("organizationLabel")} <span className="text-[var(--clicky-coral)]">*</span>
            </label>
            <input
              id="inquiry-organization"
              name="organizationName"
              type="text"
              required
              minLength={2}
              maxLength={200}
              autoComplete="organization"
              className={INPUT_CLASS}
              placeholder={t("organizationPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="inquiry-contact-name" className={LABEL_CLASS}>
              {t("contactNameLabel")} <span className="text-[var(--clicky-coral)]">*</span>
            </label>
            <input
              id="inquiry-contact-name"
              name="contactName"
              type="text"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              className={INPUT_CLASS}
              placeholder={t("contactNamePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="inquiry-contact-email" className={LABEL_CLASS}>
              {t("contactEmailLabel")} <span className="text-[var(--clicky-coral)]">*</span>
            </label>
            <input
              id="inquiry-contact-email"
              name="contactEmail"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={INPUT_CLASS}
              placeholder={t("contactEmailPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="inquiry-role" className={LABEL_CLASS}>
              {t("roleLabel")} <span className="text-[var(--clicky-coral)]">*</span>
            </label>
            <select id="inquiry-role" name="role" required className={INPUT_CLASS} defaultValue="">
              <option value="" disabled>
                {t("rolePlaceholder")}
              </option>
              <option value="secretariat">{t("roleSecretariat")}</option>
              <option value="advisor">{t("roleAdvisor")}</option>
              <option value="chair">{t("roleChair")}</option>
              <option value="other">{t("roleOther")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="inquiry-dates" className={LABEL_CLASS}>
              {t("eventDatesLabel")}
            </label>
            <input
              id="inquiry-dates"
              name="eventDates"
              type="text"
              maxLength={120}
              className={INPUT_CLASS}
              placeholder={t("eventDatesPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="inquiry-committees" className={LABEL_CLASS}>
              {t("committeeCountLabel")}
            </label>
            <input
              id="inquiry-committees"
              name="committeeCount"
              type="text"
              inputMode="numeric"
              maxLength={40}
              className={INPUT_CLASS}
              placeholder={t("committeeCountPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="inquiry-delegates" className={LABEL_CLASS}>
              {t("delegateCountLabel")}
            </label>
            <input
              id="inquiry-delegates"
              name="delegateCount"
              type="text"
              inputMode="numeric"
              maxLength={40}
              className={INPUT_CLASS}
              placeholder={t("delegateCountPlaceholder")}
            />
          </div>
        </div>

        <fieldset>
          <legend className={LABEL_CLASS}>{t("interestsLabel")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.map((item) => (
              <label
                key={item.value}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--clicky-line)] bg-[var(--clicky-paper)] px-3 py-1.5 text-xs font-medium text-[var(--clicky-ink)] transition-colors hover:bg-white has-[:checked]:border-[color-mix(in_srgb,var(--clicky-blue)_45%,var(--clicky-line))] has-[:checked]:bg-[color-mix(in_srgb,var(--clicky-blue)_12%,white)]"
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={item.value}
                  className="h-3.5 w-3.5 rounded border-[var(--clicky-line)] text-[var(--clicky-blue)] focus:ring-[var(--clicky-blue)]"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="inquiry-message" className={LABEL_CLASS}>
            {t("messageLabel")}
          </label>
          <textarea
            id="inquiry-message"
            name="message"
            rows={4}
            maxLength={4000}
            className={cn(INPUT_CLASS, "min-h-[6rem] resize-y")}
            placeholder={t("messagePlaceholder")}
          />
        </div>

        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
          <label htmlFor="inquiry-website">Website</label>
          <input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {state?.error ? (
          <p
            className="rounded-[var(--clicky-radius-sm)] border border-[color-mix(in_srgb,var(--clicky-coral)_40%,var(--clicky-line))] bg-[color-mix(in_srgb,var(--clicky-coral)_12%,white)] px-3 py-2 text-sm text-[var(--clicky-ink)]"
            role="alert"
          >
            {state.error}{" "}
            {partnershipEmail ? (
              <a href={`mailto:${partnershipEmail}`} className="font-semibold text-[var(--clicky-blue)] underline">
                {partnershipEmail}
              </a>
            ) : null}
          </p>
        ) : null}

        {state?.success ? (
          <p
            className="rounded-[var(--clicky-radius-sm)] border border-[color-mix(in_srgb,var(--clicky-mint)_45%,var(--clicky-line))] bg-[color-mix(in_srgb,var(--clicky-mint)_14%,white)] px-3 py-2 text-sm text-[var(--clicky-ink)]"
            role="status"
          >
            {t("successMessage")}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="clicky-btn-primary w-full sm:w-auto">
          {pending ? t("submitting") : t("submit")}
        </button>

        <p className="text-xs text-[var(--clicky-ink-faint)]">{t("privacyNote")}</p>
      </form>
    </div>
  );
}
