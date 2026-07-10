// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  submitSecretariatRegistrationAction,
  type SecretariatRegistrationState,
} from "@/app/actions/secretariatRegistration";
import {
  MAX_COMMITTEE_TOPICS,
  SECRETARIAT_FEATURE_KEYS,
  formatCommitteeTopicsForDisplay,
  type SecretariatCommitteeDraft,
  type SecretariatFeatureKey,
} from "@/lib/secretariat-registration";
import { cn } from "@/lib/utils";
import { EventDateRangeField } from "@/components/registration/EventDateRangeField";

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--hairline)] bg-white px-3 py-2.5 text-sm text-brand-navy placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] [color-scheme:light]";

const LABEL_CLASS = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-brand-muted";

const STEPS = ["contact", "scale", "features", "committees", "uploads", "matrix", "review"] as const;

type StepId = (typeof STEPS)[number];

type FormState = {
  contactName: string;
  contactEmail: string;
  conferenceName: string;
  eventDates: string;
  committeeCount: number;
  delegateCount: string;
  chairCount: string;
  selectedFeatures: SecretariatFeatureKey[];
  committees: SecretariatCommitteeDraft[];
  awardCriteriaDeferred: boolean;
  matrixDeferred: boolean;
  notes: string;
  ropFile: File | null;
  scheduleFile: File | null;
  awardCriteriaFile: File | null;
  committeeLogoFiles: (File | null)[];
};

const INITIAL_FORM: FormState = {
  contactName: "",
  contactEmail: "",
  conferenceName: "",
  eventDates: "",
  committeeCount: 1,
  delegateCount: "",
  chairCount: "",
  selectedFeatures: ["floor_control", "delegate_prep", "allocations_matrix"],
  committees: [{ name: "", topics: [""] }],
  awardCriteriaDeferred: true,
  matrixDeferred: true,
  notes: "",
  ropFile: null,
  scheduleFile: null,
  awardCriteriaFile: null,
  committeeLogoFiles: [null],
};

function emptyCommittee(): SecretariatCommitteeDraft {
  return { name: "", topics: [""] };
}

export function SecretariatRegistrationWizard({ className }: { className?: string }) {
  const t = useTranslations("secretariatRegistration");
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SecretariatRegistrationState | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const step = STEPS[stepIndex]!;
  const features = useMemo(
    () =>
      SECRETARIAT_FEATURE_KEYS.map((key) => ({
        key,
        label: t(`feature_${key}`),
      })),
    [t]
  );

  function syncCommitteeRows(count: number) {
    setForm((prev) => {
      const committees = [...prev.committees];
      const logos = [...prev.committeeLogoFiles];
      while (committees.length < count) {
        committees.push(emptyCommittee());
        logos.push(null);
      }
      while (committees.length > count) {
        committees.pop();
        logos.pop();
      }
      return { ...prev, committeeCount: count, committees, committeeLogoFiles: logos };
    });
  }

  function updateCommitteeTopic(committeeIndex: number, topicIndex: number, value: string) {
    setForm((prev) => {
      const committees = [...prev.committees];
      const committee = committees[committeeIndex];
      if (!committee) return prev;
      const topics = [...committee.topics];
      topics[topicIndex] = value;
      committees[committeeIndex] = { ...committee, topics };
      return { ...prev, committees };
    });
  }

  function addCommitteeTopic(committeeIndex: number) {
    setForm((prev) => {
      const committees = [...prev.committees];
      const committee = committees[committeeIndex];
      if (!committee || committee.topics.length >= MAX_COMMITTEE_TOPICS) return prev;
      committees[committeeIndex] = { ...committee, topics: [...committee.topics, ""] };
      return { ...prev, committees };
    });
  }

  function removeCommitteeTopic(committeeIndex: number, topicIndex: number) {
    setForm((prev) => {
      const committees = [...prev.committees];
      const committee = committees[committeeIndex];
      if (!committee) return prev;
      const topics = committee.topics.filter((_, index) => index !== topicIndex);
      committees[committeeIndex] = {
        ...committee,
        topics: topics.length > 0 ? topics : [""],
      };
      return { ...prev, committees };
    });
  }

  function toggleFeature(key: SecretariatFeatureKey) {
    setForm((prev) => {
      const has = prev.selectedFeatures.includes(key);
      return {
        ...prev,
        selectedFeatures: has
          ? prev.selectedFeatures.filter((k) => k !== key)
          : [...prev.selectedFeatures, key],
      };
    });
  }

  function validateStep(current: StepId): boolean {
    setStepError(null);
    if (current === "contact") {
      if (form.contactName.trim().length < 2) {
        setStepError(t("errorContactName"));
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
        setStepError(t("errorContactEmail"));
        return false;
      }
      if (form.conferenceName.trim().length < 2) {
        setStepError(t("errorConferenceName"));
        return false;
      }
    }
    if (current === "scale") {
      if (form.committeeCount < 1 || form.committeeCount > 64) {
        setStepError(t("errorCommitteeCount"));
        return false;
      }
    }
    if (current === "features" && form.selectedFeatures.length === 0) {
      setStepError(t("errorFeatures"));
      return false;
    }
    if (current === "committees") {
      const valid = form.committees.every((c) => c.name.trim().length > 0);
      if (!valid) {
        setStepError(t("errorCommitteeNames"));
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    if (!validateStep("committees") || form.selectedFeatures.length === 0) {
      setStepError(t("errorValidation"));
      return;
    }

    setPending(true);
    setStepError(null);

    const payload = new FormData();
    payload.set("contactName", form.contactName.trim());
    payload.set("contactEmail", form.contactEmail.trim());
    payload.set("conferenceName", form.conferenceName.trim());
    payload.set("eventDates", form.eventDates.trim());
    payload.set("committeeCount", String(form.committeeCount));
    payload.set("delegateCount", form.delegateCount.trim());
    payload.set("chairCount", form.chairCount.trim());
    payload.set("awardCriteriaDeferred", String(form.awardCriteriaDeferred));
    payload.set("matrixDeferred", String(form.matrixDeferred));
    payload.set("notes", form.notes.trim());
    payload.set(
      "committeesJson",
      JSON.stringify(
        form.committees.map((c) => ({
          name: c.name.trim(),
          topics: c.topics.map((topic) => topic.trim()).filter(Boolean),
          delegateCount: c.delegateCount,
          chairCount: c.chairCount,
        }))
      )
    );
    for (const feature of form.selectedFeatures) {
      payload.append("selectedFeatures", feature);
    }
    if (form.ropFile) payload.set("ropFile", form.ropFile);
    if (form.scheduleFile) payload.set("scheduleFile", form.scheduleFile);
    if (!form.awardCriteriaDeferred && form.awardCriteriaFile) {
      payload.set("awardCriteriaFile", form.awardCriteriaFile);
    }
    form.committeeLogoFiles.forEach((file, i) => {
      if (file) payload.set(`committeeLogo_${i}`, file);
    });

    const res = await submitSecretariatRegistrationAction(null, payload);
    setResult(res);
    setPending(false);
    if (res.error) setStepError(res.error);
  }

  if (result?.success) {
    return (
      <div className={cn("mun-card space-y-4 border-slate-200 p-6 dark:border-white/10", className)}>
        <h2 className="font-display text-xl font-semibold text-brand-navy">{t("successTitle")}</h2>
        <p className="text-sm leading-relaxed text-brand-muted">{t("successBody")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="mun-btn-primary rounded-full px-5 py-2 text-sm font-semibold">
            {t("successCreateAccount")}
          </Link>
          <Link href="/" className="mun-btn rounded-full px-5 py-2 text-sm font-semibold">
            {t("successBackHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <ol className="flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-muted">
        {STEPS.map((id, i) => (
          <li
            key={id}
            className={cn(
              "rounded-full border px-2.5 py-1",
              i === stepIndex
                ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--hairline))] bg-[color-mix(in_srgb,var(--accent)_10%,#fff)] text-brand-navy"
                : i < stepIndex
                  ? "border-[var(--hairline)] bg-white text-brand-navy"
                  : "border-[var(--hairline)] bg-white/60"
            )}
          >
            {t(`step_${id}`)}
          </li>
        ))}
      </ol>

      <div className="mun-card space-y-5 border-slate-200 p-6 dark:border-white/10">
        {step === "contact" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>{t("contactNameLabel")}</label>
              <input
                className={INPUT_CLASS}
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                autoComplete="name"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t("contactEmailLabel")}</label>
              <input
                type="email"
                className={INPUT_CLASS}
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>{t("conferenceNameLabel")}</label>
              <input
                className={INPUT_CLASS}
                value={form.conferenceName}
                onChange={(e) => setForm({ ...form, conferenceName: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <EventDateRangeField
                label={t("eventDatesLabel")}
                labelClassName={LABEL_CLASS}
                value={form.eventDates}
                onChange={(eventDates) => setForm({ ...form, eventDates })}
                placeholder={t("eventDatesPlaceholder")}
                inputClassName={INPUT_CLASS}
              />
            </div>
          </div>
        ) : null}

        {step === "scale" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL_CLASS}>{t("committeeCountLabel")}</label>
              <input
                type="number"
                min={1}
                max={64}
                className={INPUT_CLASS}
                value={form.committeeCount}
                onChange={(e) => syncCommitteeRows(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t("delegateCountLabel")}</label>
              <input
                className={INPUT_CLASS}
                inputMode="numeric"
                value={form.delegateCount}
                onChange={(e) => setForm({ ...form, delegateCount: e.target.value })}
                placeholder={t("delegateCountPlaceholder")}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t("chairCountLabel")}</label>
              <input
                className={INPUT_CLASS}
                inputMode="numeric"
                value={form.chairCount}
                onChange={(e) => setForm({ ...form, chairCount: e.target.value })}
                placeholder={t("chairCountPlaceholder")}
              />
            </div>
          </div>
        ) : null}

        {step === "features" ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-muted">{t("featuresHelp")}</p>
            <div className="flex flex-wrap gap-2">
              {features.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleFeature(item.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    form.selectedFeatures.includes(item.key)
                      ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--hairline))] bg-[color-mix(in_srgb,var(--accent)_10%,#fff)] text-brand-navy"
                      : "border-[var(--hairline)] bg-white text-brand-muted"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "committees" ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">{t("committeesHelp")}</p>
            {form.committees.map((committee, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--hairline)] bg-white/80 p-4 space-y-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  {t("committeeHeading", { number: i + 1 })}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLASS}>{t("committeeNameLabel")}</label>
                    <input
                      className={INPUT_CLASS}
                      value={committee.name}
                      onChange={(e) => {
                        const committees = [...form.committees];
                        committees[i] = { ...committees[i]!, name: e.target.value };
                        setForm({ ...form, committees });
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className={LABEL_CLASS}>{t("committeeTopicsLabel")}</label>
                    {committee.topics.map((topic, topicIndex) => (
                      <div key={topicIndex} className="flex gap-2">
                        <input
                          className={INPUT_CLASS}
                          value={topic}
                          placeholder={t("committeeTopicPlaceholder", { number: topicIndex + 1 })}
                          onChange={(e) => updateCommitteeTopic(i, topicIndex, e.target.value)}
                        />
                        {committee.topics.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeCommitteeTopic(i, topicIndex)}
                            className="shrink-0 rounded-xl border border-[var(--hairline)] px-3 text-xs font-semibold text-brand-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            {t("committeeRemoveTopic")}
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {committee.topics.length < MAX_COMMITTEE_TOPICS ? (
                      <button
                        type="button"
                        onClick={() => addCommitteeTopic(i)}
                        className="text-xs font-semibold text-[var(--accent)] transition hover:underline"
                      >
                        {t("committeeAddTopic")}
                      </button>
                    ) : null}
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>{t("committeeDelegatesLabel")}</label>
                    <input
                      className={INPUT_CLASS}
                      inputMode="numeric"
                      value={committee.delegateCount ?? ""}
                      onChange={(e) => {
                        const committees = [...form.committees];
                        const v = e.target.value.trim();
                        committees[i] = {
                          ...committees[i]!,
                          delegateCount: v ? Number(v) : undefined,
                        };
                        setForm({ ...form, committees });
                      }}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>{t("committeeChairsLabel")}</label>
                    <input
                      className={INPUT_CLASS}
                      inputMode="numeric"
                      value={committee.chairCount ?? ""}
                      onChange={(e) => {
                        const committees = [...form.committees];
                        const v = e.target.value.trim();
                        committees[i] = {
                          ...committees[i]!,
                          chairCount: v ? Number(v) : undefined,
                        };
                        setForm({ ...form, committees });
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>{t("committeeLogoLabel")}</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className={INPUT_CLASS}
                      onChange={(e) => {
                        const logos = [...form.committeeLogoFiles];
                        logos[i] = e.target.files?.[0] ?? null;
                        setForm({ ...form, committeeLogoFiles: logos });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === "uploads" ? (
          <div className="space-y-5">
            <div>
              <label className={LABEL_CLASS}>{t("ropUploadLabel")}</label>
              <p className="mb-2 text-xs text-brand-muted">{t("ropUploadHelp")}</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf"
                className={INPUT_CLASS}
                onChange={(e) => setForm({ ...form, ropFile: e.target.files?.[0] ?? null })}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t("scheduleUploadLabel")}</label>
              <p className="mb-2 text-xs text-brand-muted">{t("scheduleUploadHelp")}</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.csv,.xlsx,.xls"
                className={INPUT_CLASS}
                onChange={(e) => setForm({ ...form, scheduleFile: e.target.files?.[0] ?? null })}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-brand-navy">
                <input
                  type="checkbox"
                  checked={form.awardCriteriaDeferred}
                  onChange={(e) =>
                    setForm({ ...form, awardCriteriaDeferred: e.target.checked, awardCriteriaFile: null })
                  }
                />
                {t("awardCriteriaDeferLabel")}
              </label>
              {!form.awardCriteriaDeferred ? (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  className={INPUT_CLASS}
                  onChange={(e) =>
                    setForm({ ...form, awardCriteriaFile: e.target.files?.[0] ?? null })
                  }
                />
              ) : (
                <p className="text-xs text-brand-muted">{t("awardCriteriaDeferHelp")}</p>
              )}
            </div>
          </div>
        ) : null}

        {step === "matrix" ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">{t("matrixHelp")}</p>
            <label className="flex items-start gap-2 text-sm text-brand-navy">
              <input
                type="checkbox"
                checked={form.matrixDeferred}
                onChange={(e) => setForm({ ...form, matrixDeferred: e.target.checked })}
                className="mt-1"
              />
              <span>{t("matrixDeferLabel")}</span>
            </label>
            <div>
              <label className={LABEL_CLASS}>{t("notesLabel")}</label>
              <textarea
                rows={4}
                className={cn(INPUT_CLASS, "min-h-[6rem] resize-y")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("notesPlaceholder")}
              />
            </div>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="space-y-3 text-sm text-brand-navy">
            <p>
              <span className="font-semibold">{t("contactNameLabel")}:</span> {form.contactName}
            </p>
            <p>
              <span className="font-semibold">{t("contactEmailLabel")}:</span> {form.contactEmail}
            </p>
            <p>
              <span className="font-semibold">{t("conferenceNameLabel")}:</span> {form.conferenceName}
            </p>
            <p>
              <span className="font-semibold">{t("committeeCountLabel")}:</span> {form.committeeCount}
            </p>
            <p>
              <span className="font-semibold">{t("fieldFeatures")}:</span>{" "}
              {form.selectedFeatures.map((k) => t(`feature_${k}`)).join(", ")}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {form.committees.map((c, i) => {
                const topics = formatCommitteeTopicsForDisplay(c.topics);
                return (
                  <li key={i}>
                    {c.name}
                    {topics ? ` — ${topics}` : ""}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-brand-muted">{t("reviewManualNote")}</p>
          </div>
        ) : null}

        {stepError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {stepError}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || pending}
            className="mun-btn rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t("back")}
          </button>
          {step !== "review" ? (
            <button
              type="button"
              onClick={goNext}
              className="mun-btn-primary rounded-full px-5 py-2 text-sm font-semibold"
            >
              {t("next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={pending}
              className="mun-btn-primary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {pending ? t("submitting") : t("submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
