// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type GuidedMotionPreset = {
  code: string;
  label: string;
  title?: string;
};

export type GuidedMotionDraftResult = {
  procedure_code: string;
  title: string;
  description: string;
  motioner_allocation_id: string | null;
  moderated_total_minutes: string;
  moderated_speaker_seconds: string;
  unmoderated_total_minutes: string;
  consultation_total_minutes: string;
};

type AllocOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  isPressCorps: boolean;
  presets: GuidedMotionPreset[];
  allocations: AllocOption[];
  motionFloorOpen: boolean;
  onComplete: (draft: GuidedMotionDraftResult, action: "draft" | "record" | "create") => void;
};

type Step = "procedure" | "details" | "motioner" | "notes" | "confirm";

export function GuidedMotionWizard({
  open,
  onClose,
  isPressCorps,
  presets,
  allocations,
  motionFloorOpen,
  onComplete,
}: Props) {
  const t = useTranslations("sessionControlClient");
  const options = useMemo(() => presets.filter((p) => p.code), [presets]);
  const [step, setStep] = useState<Step>("procedure");
  const [procedureCode, setProcedureCode] = useState<string>("");
  const [seconds, setSeconds] = useState("90");
  const [minutes, setMinutes] = useState("20");
  const [subject, setSubject] = useState("");
  const [assignment, setAssignment] = useState("");
  const [committee, setCommittee] = useState("");
  const [title, setTitle] = useState("");
  const [motionerId, setMotionerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function resetAndClose() {
    setStep("procedure");
    setProcedureCode("");
    setSeconds("90");
    setMinutes("20");
    setSubject("");
    setAssignment("");
    setCommittee("");
    setTitle("");
    setMotionerId("");
    setNotes("");
    setError(null);
    onClose();
  }

  function buildDraft(): GuidedMotionDraftResult | null {
    const code = procedureCode;
    if (!code) {
      setError(t("invalidProcedureSelection"));
      return null;
    }

    let titleTrimmed = "";
    let pressTotalMinutes = "";
    let pressSpeakerSeconds = "";

    if (isPressCorps) {
      if (code === "extend_opening_speech") {
        const n = Number(seconds);
        if (!Number.isFinite(n) || n <= 0) {
          setError(t("guidedPressExtendRequiresSeconds"));
          return null;
        }
        pressSpeakerSeconds = String(Math.round(n));
        titleTrimmed = `Motion to Extend Speaker Time to ${pressSpeakerSeconds} seconds`;
      } else if (code === "roll_call_vote") {
        const s = subject.trim();
        if (!s) {
          setError(t("guidedPressRollCallRequiresSubject"));
          return null;
        }
        titleTrimmed = `Motion to vote on ${s} by roll call.`;
      } else if (code === "interview") {
        const n = Number(minutes);
        if (!Number.isFinite(n) || n <= 0) {
          setError(t("guidedPressInterviewRequiresMinutes"));
          return null;
        }
        const a = assignment.trim();
        if (!a) {
          setError(t("guidedPressInterviewRequiresAssignment"));
          return null;
        }
        pressTotalMinutes = String(Math.round(n));
        titleTrimmed = `Motion for a ${pressTotalMinutes} minute interview period for completing the ${a} assignment.`;
      } else if (code === "press_conference") {
        const n = Number(minutes);
        if (!Number.isFinite(n) || n <= 0) {
          setError(t("guidedPressConferenceRequiresMinutes"));
          return null;
        }
        const c = committee.trim();
        if (!c) {
          setError(t("guidedPressConferenceRequiresCommittee"));
          return null;
        }
        pressTotalMinutes = String(Math.round(n));
        titleTrimmed = `Motion for a Press Conference with a ${c} delegate.`;
      } else if (code === "writing_time") {
        const n = Number(minutes);
        if (!Number.isFinite(n) || n <= 0) {
          setError(t("guidedPressWritingRequiresMinutes"));
          return null;
        }
        pressTotalMinutes = String(Math.round(n));
        titleTrimmed = `Motion for ${pressTotalMinutes} minutes of Writing Time.`;
      } else {
        titleTrimmed = title.trim() || options.find((o) => o.code === code)?.title || "";
      }
    } else if (code === "moderated_caucus") {
      const topic = title.trim();
      if (!topic) {
        setError(t("guidedTopicIsRequired"));
        return null;
      }
      const n = Number(minutes);
      if (!Number.isFinite(n) || n <= 0) {
        setError(t("guidedModeratedRequiresTotalMinutes"));
        return null;
      }
      const s = Number(seconds);
      if (!Number.isFinite(s) || s <= 0) {
        setError(t("guidedModeratedRequiresSpeakerSeconds"));
        return null;
      }
      titleTrimmed = topic;
    } else if (code === "consultation") {
      if (!title.trim()) {
        setError(t("guidedConsultationRequiresTopicOrPurpose"));
        return null;
      }
      const n = Number(minutes);
      if (!Number.isFinite(n) || n <= 0) {
        setError(t("guidedConsultationRequiresTotalMinutes"));
        return null;
      }
      titleTrimmed = title.trim();
    } else if (code === "unmoderated_caucus") {
      const n = Number(minutes);
      if (!Number.isFinite(n) || n <= 0) {
        setError(t("guidedUnmoderatedRequiresTotalMinutes"));
        return null;
      }
      titleTrimmed = title.trim();
    } else {
      titleTrimmed = title.trim() || options.find((o) => o.code === code)?.title || "";
    }

    let description = notes.trim();
    if (code === "moderated_caucus") {
      const timing = t("guidedTimingTotalMinutesLine", { minutes }) + t("guidedTimingSpeakerSecondsLine", { seconds });
      description = description ? `${description}\n${timing}` : timing;
    } else if (code === "unmoderated_caucus" || code === "consultation") {
      const timing = t("guidedTimingTotalMinutesLine", { minutes });
      description = description ? `${description}\n${timing}` : timing;
    }

    return {
      procedure_code: code,
      title: titleTrimmed,
      description,
      motioner_allocation_id: motionerId || null,
      moderated_total_minutes: code === "moderated_caucus" ? String(Math.round(Number(minutes))) : "",
      moderated_speaker_seconds:
        code === "moderated_caucus"
          ? String(Math.round(Number(seconds)))
          : isPressCorps && code === "extend_opening_speech"
            ? pressSpeakerSeconds
            : "",
      unmoderated_total_minutes:
        code === "unmoderated_caucus" ||
        code === "interview" ||
        code === "press_conference" ||
        code === "writing_time"
          ? code === "unmoderated_caucus"
            ? String(Math.round(Number(minutes)))
            : pressTotalMinutes
          : "",
      consultation_total_minutes: code === "consultation" ? String(Math.round(Number(minutes))) : "",
    };
  }

  function goNextFromProcedure() {
    if (!procedureCode) {
      setError(t("invalidProcedureSelection"));
      return;
    }
    setError(null);
    const preset = options.find((o) => o.code === procedureCode);
    if (!isPressCorps && preset?.title) setTitle(preset.title);
    if (!isPressCorps && procedureCode === "moderated_caucus") {
      setMinutes("10");
      setSeconds("60");
    }
    setStep("details");
  }

  function goNextFromDetails() {
    const draft = buildDraft();
    if (!draft) return;
    setError(null);
    setStep("motioner");
  }

  const selectedLabel = options.find((o) => o.code === procedureCode)?.label ?? procedureCode;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-motion-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#D1D1D6] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#D1D1D6] px-5 py-4">
          <div>
            <h2 id="guided-motion-title" className="text-base font-semibold tracking-tight text-[#1D1D1F]">
              {t("addMotionGuided")}
            </h2>
            <p className="mt-0.5 text-xs text-[#6E6E73]">
              {isPressCorps ? "Press Corps RoP" : "Step-by-step"} · {step}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full px-2.5 py-1 text-sm text-[#6E6E73] hover:bg-[#F2F2F7]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
          ) : null}

          {step === "procedure" ? (
            <label className="block text-sm text-[#1D1D1F]">
              <span className="mb-1.5 block text-xs font-medium text-[#6E6E73]">
                {isPressCorps ? t("guidedPressStepChooseProcedure") : t("guidedStepChooseProcedure")}
              </span>
              <select
                className="w-full rounded-xl border border-[#D1D1D6] bg-white px-3 py-2.5 text-sm"
                value={procedureCode}
                onChange={(e) => setProcedureCode(e.target.value)}
              >
                <option value="">—</option>
                {options.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {step === "details" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#1D1D1F]">{selectedLabel}</p>
              {isPressCorps && procedureCode === "extend_opening_speech" ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressExtendSeconds")}</span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                  />
                </label>
              ) : null}
              {isPressCorps && procedureCode === "roll_call_vote" ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressRollCallSubject")}</span>
                  <input
                    className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("pressRollCallSubjectPlaceholder")}
                  />
                </label>
              ) : null}
              {isPressCorps && procedureCode === "interview" ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressTotalMinutes")}</span>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressRelatedAssignment")}</span>
                    <input
                      className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                      value={assignment}
                      onChange={(e) => setAssignment(e.target.value)}
                      placeholder={t("pressRelatedAssignmentPlaceholder")}
                    />
                  </label>
                </>
              ) : null}
              {isPressCorps && procedureCode === "press_conference" ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressTotalMinutes")}</span>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressCommitteeOrDelegate")}</span>
                    <input
                      className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                      value={committee}
                      onChange={(e) => setCommittee(e.target.value)}
                      placeholder={t("pressCommitteeOrDelegatePlaceholder")}
                    />
                  </label>
                </>
              ) : null}
              {isPressCorps && procedureCode === "writing_time" ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-[#6E6E73]">{t("pressTotalMinutes")}</span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                </label>
              ) : null}
              {!isPressCorps &&
              (procedureCode === "moderated_caucus" ||
                procedureCode === "consultation" ||
                procedureCode === "unmoderated_caucus") ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-[#6E6E73]">
                      {procedureCode === "consultation" ? t("guidedStepTopicPurpose") : t("guidedStepTopic")}
                    </span>
                    <input
                      className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-[#6E6E73]">{t("totalTimeMinutes")}</span>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </label>
                  {procedureCode === "moderated_caucus" ? (
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs text-[#6E6E73]">{t("speakerTimeSeconds")}</span>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                        value={seconds}
                        onChange={(e) => setSeconds(e.target.value)}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}
              {!isPressCorps &&
              procedureCode !== "moderated_caucus" &&
              procedureCode !== "consultation" &&
              procedureCode !== "unmoderated_caucus" ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-[#6E6E73]">{t("guidedStepMotionTitleOptional")}</span>
                  <input
                    className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {step === "motioner" ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs text-[#6E6E73]">
                {isPressCorps ? t("guidedPressStepMotioner") : t("guidedStepMotioner")}
              </span>
              <select
                className="w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                value={motionerId}
                onChange={(e) => setMotionerId(e.target.value)}
              >
                <option value="">{t("guidedMotionerNotSpecified")}</option>
                {allocations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {step === "notes" ? (
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs text-[#6E6E73]">
                {isPressCorps ? t("guidedPressStepNotesOptional") : t("guidedStepDescriptionNotesOptional")}
              </span>
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-[#D1D1D6] px-3 py-2.5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-2 rounded-xl bg-[#F2F2F7] px-3 py-3 text-sm text-[#1D1D1F]">
              <p className="font-medium">{buildDraft()?.title || selectedLabel}</p>
              {buildDraft()?.description ? (
                <p className="whitespace-pre-wrap text-xs text-[#6E6E73]">{buildDraft()?.description}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#D1D1D6] px-5 py-3">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#6E6E73] hover:bg-[#F2F2F7]"
            onClick={() => {
              if (step === "procedure") resetAndClose();
              else if (step === "details") setStep("procedure");
              else if (step === "motioner") setStep("details");
              else if (step === "notes") setStep("motioner");
              else setStep("notes");
            }}
          >
            {step === "procedure" ? "Cancel" : "Back"}
          </button>
          <div className="flex flex-wrap gap-2">
            {step === "procedure" ? (
              <button
                type="button"
                className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
                onClick={goNextFromProcedure}
              >
                Next
              </button>
            ) : null}
            {step === "details" ? (
              <button
                type="button"
                className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
                onClick={goNextFromDetails}
              >
                Next
              </button>
            ) : null}
            {step === "motioner" ? (
              <button
                type="button"
                className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
                onClick={() => {
                  setError(null);
                  setStep("notes");
                }}
              >
                Next
              </button>
            ) : null}
            {step === "notes" ? (
              <button
                type="button"
                className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
                onClick={() => {
                  if (!buildDraft()) return;
                  setStep("confirm");
                }}
              >
                Next
              </button>
            ) : null}
            {step === "confirm" ? (
              <>
                <button
                  type="button"
                  className="rounded-full border border-[#D1D1D6] bg-[#F2F2F7] px-4 py-2 text-sm font-medium text-[#1D1D1F]"
                  onClick={() => {
                    const draft = buildDraft();
                    if (!draft) return;
                    onComplete(draft, "draft");
                    resetAndClose();
                  }}
                >
                  Draft only
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED]"
                  onClick={() => {
                    const draft = buildDraft();
                    if (!draft) return;
                    onComplete(draft, motionFloorOpen ? "record" : "create");
                    resetAndClose();
                  }}
                >
                  {motionFloorOpen ? t("guidedConfirmRecordStatedMotionNow").replace(/\?$/, "") : "Create and open"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
