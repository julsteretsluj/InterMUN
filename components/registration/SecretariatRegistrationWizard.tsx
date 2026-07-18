// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Copy, FileText, Link2, Mail, Share2, UserPlus, Ellipsis, Trash2, User, Users, Sparkles, Building2, Upload, Grid3x3, CheckCircle2, Check } from "lucide-react";
import {
  submitSecretariatRegistrationAction,
  type SecretariatRegistrationState,
} from "@/app/actions/secretariatRegistration";
import {
  MAX_COMMITTEE_TOPICS,
  MAX_INTAKE_FILE_BYTES,
  SECRETARIAT_FEATURE_KEYS,
  formatCommitteeTopicsForDisplay,
  isAllowedLogoFile,
  type SecretariatCommitteeDraft,
  type SecretariatFeatureKey,
} from "@/lib/secretariat-registration";
import {
  buildSecretariatRegistrationShareText,
  copyTextToClipboard,
  openMailto,
  shareTextNative,
} from "@/lib/secretariat-registration-share";
import { EventDateRangeField } from "@/components/registration/EventDateRangeField";
import { AppleActivityView } from "@/components/ui/AppleActivityView";
import { AppleConfirmSheet } from "@/components/ui/AppleSheet";
import { AppleListRow, AppleListSection, AppleListSwitchRow } from "@/components/ui/AppleList";
import {
  AppleMenu,
  AppleMenuContent,
  AppleMenuItem,
  AppleMenuTrigger,
} from "@/components/ui/AppleMenu";
import { AppleWindow, AppleWindowWithSidebar } from "@/components/ui/AppleWindow";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  useAppleNotifications,
} from "@/components/ui/AppleNotification";
import { ApplePageControl } from "@/components/ui/ApplePageControl";
import { AppleFileField } from "@/components/ui/AppleFileField";
import { AppleHelpPopover } from "@/components/ui/ApplePopover";
import { AppleSegmentedControl } from "@/components/ui/AppleSegmentedControl";
import { AppleStepper, AppleStepperField } from "@/components/ui/AppleStepper";
import {
  AppleToolbarBackButton,
  AppleToolbarBottom,
  AppleToolbarButton,
} from "@/components/ui/AppleToolbar";
import {
  AppleTextAreaField,
  AppleTextField,
  AppleTextFieldGroup,
} from "@/components/ui/AppleTextField";
import {
  AppleSidebar,
  AppleSidebarRow,
  AppleSidebarSection,
} from "@/components/ui/AppleSidebar";


const STEPS = ["contact", "scale", "features", "committees", "uploads", "matrix", "review"] as const;

type StepId = (typeof STEPS)[number];

const STEP_GROUPS = [
  { id: "basics", labelKey: "sidebarSectionBasics", steps: ["contact", "scale"] as const },
  { id: "setup", labelKey: "sidebarSectionSetup", steps: ["features", "committees"] as const },
  { id: "files", labelKey: "sidebarSectionFiles", steps: ["uploads", "matrix"] as const },
  { id: "finish", labelKey: "sidebarSectionFinish", steps: ["review"] as const },
] as const;

const STEP_ICONS: Record<StepId, ReactNode> = {
  contact: <User className="h-4 w-4" strokeWidth={2} aria-hidden />,
  scale: <Users className="h-4 w-4" strokeWidth={2} aria-hidden />,
  features: <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />,
  committees: <Building2 className="h-4 w-4" strokeWidth={2} aria-hidden />,
  uploads: <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />,
  matrix: <Grid3x3 className="h-4 w-4" strokeWidth={2} aria-hidden />,
  review: <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden />,
};

const STEP_HELP_KEYS: Partial<Record<StepId, "featuresHelp" | "committeesHelp" | "ropUploadHelp" | "matrixHelp">> = {
  features: "featuresHelp",
  committees: "committeesHelp",
  uploads: "ropUploadHelp",
  matrix: "matrixHelp",
};

type FormState = {
  contactName: string;
  contactEmail: string;
  conferenceName: string;
  eventDates: string;
  conferenceLogoFile: File | null;
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
  conferenceLogoFile: null,
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

function parseOptionalCountString(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function optionalCountToString(value: number): string {
  return value === 0 ? "" : String(value);
}

function optionalCountDisplay(raw: string): string {
  const value = parseOptionalCountString(raw);
  return value === 0 ? "—" : String(value);
}

export function SecretariatRegistrationWizard({
  className,
}: {
  className?: string;
  appName?: string;
}) {
  return <SecretariatRegistrationWizardInner className={className} />;
}

function SecretariatRegistrationWizardInner({
  className,
}: {
  className?: string;
}) {
  const t = useTranslations("secretariatRegistration");
  const tCommon = useTranslations("common");
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SecretariatRegistrationState | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [removeTopicTarget, setRemoveTopicTarget] = useState<{
    committeeIndex: number;
    topicIndex: number;
  } | null>(null);
  const [submitSheetOpen, setSubmitSheetOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { push: pushNotification, dismiss: dismissNotification } = useAppleNotifications();

  const step = STEPS[stepIndex]!;
  const features = useMemo(
    () =>
      SECRETARIAT_FEATURE_KEYS.map((key) => ({
        key,
        label: t(`feature_${key}`),
      })),
    [t]
  );
  const featureLabelMap = useMemo(
    () => Object.fromEntries(features.map((feature) => [feature.key, feature.label])),
    [features]
  );
  const shareText = useMemo(
    () =>
      buildSecretariatRegistrationShareText(
        {
          conferenceName: form.conferenceName,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          eventDates: form.eventDates,
          committeeCount: form.committeeCount,
          delegateCount: form.delegateCount,
          chairCount: form.chairCount,
          selectedFeatures: form.selectedFeatures,
          committees: form.committees.map((committee) => ({
            name: committee.name,
            topics: committee.topics,
          })),
          requestId: result?.requestId,
        },
        {
          heading: t("activityShareHeading"),
          contactName: t("contactNameLabel"),
          contactEmail: t("contactEmailLabel"),
          eventDates: t("eventDatesLabel"),
          committeeCount: t("committeeCountLabel"),
          delegateCount: t("delegateCountLabel"),
          chairCount: t("chairCountLabel"),
          features: t("fieldFeatures"),
          committees: t("fieldCommittees"),
          requestId: t("activityShareRequestId"),
        },
        featureLabelMap
      ),
    [form, result?.requestId, featureLabelMap, t]
  );

  useEffect(() => {
    if (!stepError) {
      dismissNotification("wizard-error");
      return;
    }

    pushNotification({
      id: "wizard-error",
      group: "registration",
      variant: "error",
      title: t("notificationErrorTitle"),
      message: stepError,
      durationMs: null,
      onDismiss: () => setStepError(null),
      actions: [
        {
          id: "dismiss-error",
          label: t("notificationDismiss"),
          onSelect: () => setStepError(null),
        },
      ],
    });
  }, [dismissNotification, pushNotification, stepError, t]);

  function getSignupUrl() {
    return `${window.location.origin}/signup`;
  }

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
      if (!form.conferenceLogoFile) {
        setStepError(t("errorConferenceLogo"));
        return false;
      }
      if (!isAllowedLogoFile(form.conferenceLogoFile)) {
        setStepError(t("errorConferenceLogoInvalid"));
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

  function goToStep(index: number) {
    setStepError(null);
    setStepIndex(index);
  }

  function goBack() {
    goToStep(Math.max(stepIndex - 1, 0));
  }

  const stepHelpKey = STEP_HELP_KEYS[step];
  const toolbarTrailing = stepHelpKey ? (
    <AppleHelpPopover label={t("popoverHelpLabel")}>{t(stepHelpKey)}</AppleHelpPopover>
  ) : undefined;
  const toolbarBottomProps = {
    "aria-label": t("toolbarNavigationLabel"),
    leading:
      stepIndex > 0 ? (
        <AppleToolbarBackButton label={t("back")} onClick={goBack} disabled={pending} />
      ) : undefined,
    center: (
      <ApplePageControl
        className="md:hidden"
        pageCount={STEPS.length}
        currentPage={stepIndex}
        onPageChange={(page) => {
          if (page <= stepIndex) goToStep(page);
        }}
        aria-label={t("pageControlLabel")}
      />
    ),
    trailing:
      step !== "review" ? (
        <AppleToolbarButton label={t("next")} onClick={goNext} variant="filled" />
      ) : (
        <AppleToolbarButton
          label={pending ? t("submitting") : t("submit")}
          onClick={() => setSubmitSheetOpen(true)}
          disabled={pending}
          variant="filled"
        />
      ),
  };

  const wizardFooter = (
    <AppleToolbarBottom {...toolbarBottomProps} />
  );

  async function submit() {
    if (!validateStep("contact") || !validateStep("committees") || form.selectedFeatures.length === 0) {
      setStepError(t("errorValidation"));
      return;
    }

    if (!form.conferenceLogoFile || !isAllowedLogoFile(form.conferenceLogoFile)) {
      setStepError(t("errorConferenceLogo"));
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
    payload.set("conferenceLogoFile", form.conferenceLogoFile);
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
    const contactInitials = form.contactName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <>
        <AppleWindow title={t("successTitle")} resizable={false} className={className}>
          <div className="space-y-5 p-6 md:p-8">
          <p className="mun-apple-text mun-apple-text-body mun-vibrancy-secondary">{t("successBody")}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <AppleToolbarButton
              label={t("successShare")}
              onClick={() => setActivityOpen(true)}
              variant="filled"
            />
            <Link href="/signup" className="mun-apple-btn mun-apple-btn-glass-blue">
              {t("successCreateAccount")}
            </Link>
            <Link href="/" className="mun-apple-btn mun-apple-btn-tinted-gray">
              {t("successBackHome")}
            </Link>
          </div>
          </div>
        </AppleWindow>

        <AppleActivityView
          open={activityOpen}
          onOpenChange={setActivityOpen}
          title={form.conferenceName || t("title")}
          subtitle={t("activitySubtitle")}
          metaLabel={t("activityMetaLabel")}
          metaHint={t("activityMetaHint")}
          closeLabel={tCommon("cancel")}
          contacts={[
            {
              id: "contact",
              name: form.contactName || t("contactNameLabel"),
              initials: contactInitials || undefined,
              badge: <Mail className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />,
              onSelect: () =>
                openMailto(t("activityShareHeading"), shareText, form.contactEmail || undefined),
            },
          ]}
          shortcuts={[
            {
              id: "mail",
              label: t("activityShortcutMail"),
              tint: "var(--system-green)",
              icon: <Mail className="h-7 w-7" strokeWidth={1.75} aria-hidden />,
              onSelect: () => openMailto(t("activityShareHeading"), shareText),
            },
            {
              id: "copy",
              label: t("activityShortcutCopy"),
              tint: "var(--system-gray)",
              icon: <Copy className="h-7 w-7" strokeWidth={1.75} aria-hidden />,
              onSelect: () => void copyTextToClipboard(shareText),
            },
            {
              id: "share",
              label: t("activityShortcutShare"),
              tint: "var(--system-blue)",
              icon: <Share2 className="h-7 w-7" strokeWidth={1.75} aria-hidden />,
              onSelect: () => {
                void shareTextNative(form.conferenceName || t("title"), shareText, getSignupUrl());
              },
            },
          ]}
          quickActions={[
            {
              id: "copy-link",
              label: t("activityQuickCopyLink"),
              icon: <Link2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
              onSelect: () => void copyTextToClipboard(getSignupUrl()),
            },
            {
              id: "copy-summary",
              label: t("activityQuickCopySummary"),
              icon: <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
              onSelect: () => void copyTextToClipboard(shareText),
            },
          ]}
          listActions={[
            {
              id: "copy-summary-list",
              label: t("activityListCopySummary"),
              icon: <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              onSelect: () => void copyTextToClipboard(shareText),
            },
            {
              id: "email-team",
              label: t("activityListEmailTeam"),
              icon: <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              onSelect: () => openMailto(t("activityShareHeading"), shareText),
            },
            {
              id: "open-signup",
              label: t("activityListOpenSignup"),
              icon: <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              onSelect: () => {
                window.open(getSignupUrl(), "_blank", "noopener,noreferrer");
              },
            },
          ]}
        />
      </>
    );
  }

  return (
    <>
    <AppleWindowWithSidebar
      className={className}
      resizable={false}
      title={t(`step_${step}`)}
      subtitle={t("toolbarStepSubtitle", { current: stepIndex + 1, total: STEPS.length })}
      trailing={toolbarTrailing}
      footer={wizardFooter}
      sidebarClassName="hidden md:flex flex-col"
      sidebar={
        <AppleSidebar className="h-full min-h-0 w-full" aria-label={t("menuStepsSection")}>
          {STEP_GROUPS.map((group) => (
              <AppleSidebarSection
                key={group.id}
                heading={t(group.labelKey)}
                detail={String(group.steps.length)}
                collapsible
              >
                {group.steps.map((id) => {
                  const index = STEPS.indexOf(id);
                  const completed = index < stepIndex;
                  return (
                    <AppleSidebarRow
                      key={id}
                      title={t(`step_${id}`)}
                      leading={STEP_ICONS[id]}
                      detail={
                        completed ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                        ) : (
                          String(index + 1)
                        )
                      }
                      selected={id === step}
                      disabled={index > stepIndex}
                      onClick={() => goToStep(index)}
                    />
                  );
                })}
              </AppleSidebarSection>
            ))}
        </AppleSidebar>
      }
    >
      <div className="mun-apple-wizard-step min-w-0 flex-1 space-y-6 p-4 md:p-6">
        {step === "contact" ? (
          <AppleTextFieldGroup>
            <AppleTextField
              placeholder={t("contactNameLabel")}
              label={t("contactNameLabel")}
              value={form.contactName}
              onChange={(contactName) => setForm({ ...form, contactName })}
              autoComplete="name"
              clearLabel={tCommon("clear")}
            />
            <AppleTextField
              type="email"
              placeholder={t("contactEmailLabel")}
              label={t("contactEmailLabel")}
              value={form.contactEmail}
              onChange={(contactEmail) => setForm({ ...form, contactEmail })}
              autoComplete="email"
              clearLabel={tCommon("clear")}
            />
            <AppleTextField
              placeholder={t("conferenceNameLabel")}
              label={t("conferenceNameLabel")}
              value={form.conferenceName}
              onChange={(conferenceName) => setForm({ ...form, conferenceName })}
              clearLabel={tCommon("clear")}
            />
            <EventDateRangeField
              grouped
              label={t("eventDatesLabel")}
              value={form.eventDates}
              onChange={(eventDates) => setForm({ ...form, eventDates })}
              placeholder={t("eventDatesPlaceholder")}
            />
            <AppleFileField
              grouped={false}
              label={t("conferenceLogoLabel")}
              help={t("conferenceLogoHelp")}
              accept="image/png,image/jpeg,image/webp"
              required
              value={form.conferenceLogoFile}
              onChange={(conferenceLogoFile) => setForm({ ...form, conferenceLogoFile })}
              chooseLabel={tCommon("chooseFile")}
              emptyLabel={tCommon("noFileChosen")}
              clearLabel={tCommon("clear")}
              error={
                form.conferenceLogoFile && form.conferenceLogoFile.size > MAX_INTAKE_FILE_BYTES
                  ? t("errorConferenceLogoTooLarge")
                  : null
              }
            />
          </AppleTextFieldGroup>
        ) : null}

        {step === "scale" ? (
          <AppleListSection>
            <AppleListRow
              title={t("committeeCountLabel")}
              detail={String(form.committeeCount)}
              trailing={
                <AppleStepper
                  value={form.committeeCount}
                  min={1}
                  max={64}
                  onChange={(count) => syncCommitteeRows(count)}
                  decreaseLabel={t("stepperDecrease")}
                  increaseLabel={t("stepperIncrease")}
                  aria-label={t("committeeCountLabel")}
                />
              }
            />
            <AppleListRow
              title={t("delegateCountLabel")}
              detail={optionalCountDisplay(form.delegateCount)}
              trailing={
                <AppleStepper
                  value={parseOptionalCountString(form.delegateCount)}
                  min={0}
                  max={99999}
                  onChange={(count) =>
                    setForm({ ...form, delegateCount: optionalCountToString(count) })
                  }
                  decreaseLabel={t("stepperDecrease")}
                  increaseLabel={t("stepperIncrease")}
                  aria-label={t("delegateCountLabel")}
                />
              }
            />
            <AppleListRow
              title={t("chairCountLabel")}
              detail={optionalCountDisplay(form.chairCount)}
              trailing={
                <AppleStepper
                  value={parseOptionalCountString(form.chairCount)}
                  min={0}
                  max={9999}
                  onChange={(count) => setForm({ ...form, chairCount: optionalCountToString(count) })}
                  decreaseLabel={t("stepperDecrease")}
                  increaseLabel={t("stepperIncrease")}
                  aria-label={t("chairCountLabel")}
                />
              }
            />
          </AppleListSection>
        ) : null}

        {step === "features" ? (
          <div className="space-y-4">
            <p className="sr-only">{t("featuresHelp")}</p>
            <AppleListSection>
              {features.map((item) => {
                const active = form.selectedFeatures.includes(item.key);
                return (
                  <AppleListSwitchRow
                    key={item.key}
                    label={item.label}
                    checked={active}
                    onChange={(checked) => {
                      if (checked !== active) toggleFeature(item.key);
                    }}
                  />
                );
              })}
            </AppleListSection>
          </div>
        ) : null}

        {step === "committees" ? (
          <div className="space-y-5">
            <p className="sr-only">{t("committeesHelp")}</p>
            {form.committees.map((committee, i) => (
              <GlassPanel key={i} dense material="thin" interactive className="space-y-4">
                <p className="mun-apple-text mun-apple-text-headline !mb-0">{t("committeeHeading", { number: i + 1 })}</p>
                <div className="space-y-3">
                  <AppleTextFieldGroup>
                    <AppleTextField
                      placeholder={t("committeeNameLabel")}
                      label={t("committeeNameLabel")}
                      value={committee.name}
                      onChange={(name) => {
                        const committees = [...form.committees];
                        committees[i] = { ...committees[i]!, name };
                        setForm({ ...form, committees });
                      }}
                      clearLabel={tCommon("clear")}
                    />
                  </AppleTextFieldGroup>
                  <div className="space-y-2">
                    <p className="mun-apple-text-field-section-header !px-0 !normal-case">
                      {t("committeeTopicsLabel")}
                    </p>
                    {committee.topics.map((topic, topicIndex) => (
                      <div key={topicIndex} className="flex gap-2">
                        <AppleTextFieldGroup className="min-w-0 flex-1">
                          <AppleTextField
                            placeholder={t("committeeTopicPlaceholder", { number: topicIndex + 1 })}
                            label={t("committeeTopicPlaceholder", { number: topicIndex + 1 })}
                            value={topic}
                            onChange={(value) => updateCommitteeTopic(i, topicIndex, value)}
                            clearLabel={tCommon("clear")}
                          />
                        </AppleTextFieldGroup>
                        {committee.topics.length > 1 ? (
                          <AppleMenu>
                            <AppleMenuTrigger
                              aria-label={t("menuTopicActions")}
                              className="mun-apple-btn mun-apple-btn-tinted-gray mun-apple-btn-compact shrink-0 px-2.5"
                            >
                              <Ellipsis className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </AppleMenuTrigger>
                            <AppleMenuContent align="end">
                              <AppleMenuItem
                                icon={<Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
                                label={t("menuRemoveTopic")}
                                destructive
                                onSelect={() => setRemoveTopicTarget({ committeeIndex: i, topicIndex })}
                              />
                            </AppleMenuContent>
                          </AppleMenu>
                        ) : null}
                      </div>
                    ))}
                    {committee.topics.length < MAX_COMMITTEE_TOPICS ? (
                      <button
                        type="button"
                        onClick={() => addCommitteeTopic(i)}
                        className="mun-apple-btn mun-apple-btn-plain-blue mun-apple-btn-compact !px-0"
                      >
                        {t("committeeAddTopic")}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                  <AppleStepperField
                    layout="stacked"
                    label={t("committeeDelegatesLabel")}
                    valueLabel={
                      (committee.delegateCount ?? 0) === 0 ? "—" : String(committee.delegateCount)
                    }
                    value={committee.delegateCount ?? 0}
                    min={0}
                    max={9999}
                    onChange={(count) => {
                      const committees = [...form.committees];
                      committees[i] = {
                        ...committees[i]!,
                        delegateCount: count === 0 ? undefined : count,
                      };
                      setForm({ ...form, committees });
                    }}
                    decreaseLabel={t("stepperDecrease")}
                    increaseLabel={t("stepperIncrease")}
                    aria-label={t("committeeDelegatesLabel")}
                  />
                  <AppleStepperField
                    layout="stacked"
                    label={t("committeeChairsLabel")}
                    valueLabel={(committee.chairCount ?? 0) === 0 ? "—" : String(committee.chairCount)}
                    value={committee.chairCount ?? 0}
                    min={0}
                    max={99}
                    onChange={(count) => {
                      const committees = [...form.committees];
                      committees[i] = {
                        ...committees[i]!,
                        chairCount: count === 0 ? undefined : count,
                      };
                      setForm({ ...form, committees });
                    }}
                    decreaseLabel={t("stepperDecrease")}
                    increaseLabel={t("stepperIncrease")}
                    aria-label={t("committeeChairsLabel")}
                  />
                  <AppleTextFieldGroup className="sm:col-span-2">
                    <p className="mun-apple-text-field-section-header !px-0 !normal-case">
                      {t("committeeLogoLabel")}
                    </p>
                    <AppleFileField
                      accept="image/png,image/jpeg,image/webp"
                      value={form.committeeLogoFiles[i] ?? null}
                      onChange={(file) => {
                        const committeeLogoFiles = [...form.committeeLogoFiles];
                        committeeLogoFiles[i] = file;
                        setForm({ ...form, committeeLogoFiles });
                      }}
                      chooseLabel={tCommon("chooseFile")}
                      emptyLabel={tCommon("noFileChosen")}
                      clearLabel={tCommon("clear")}
                    />
                  </AppleTextFieldGroup>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        ) : null}

        {step === "uploads" ? (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="mun-apple-text-field-section-header !px-0">{t("ropUploadLabel")}</p>
                <AppleHelpPopover label={t("popoverHelpLabel")}>{t("ropUploadHelp")}</AppleHelpPopover>
              </div>
              <p className="sr-only">{t("ropUploadHelp")}</p>
              <AppleTextFieldGroup>
                <AppleFileField
                  accept=".pdf,.doc,.docx,application/pdf"
                  value={form.ropFile}
                  onChange={(ropFile) => setForm({ ...form, ropFile })}
                  chooseLabel={tCommon("chooseFile")}
                  emptyLabel={tCommon("noFileChosen")}
                  clearLabel={tCommon("clear")}
                />
              </AppleTextFieldGroup>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="mun-apple-text-field-section-header !px-0">{t("scheduleUploadLabel")}</p>
                <AppleHelpPopover label={t("popoverHelpLabel")}>{t("scheduleUploadHelp")}</AppleHelpPopover>
              </div>
              <p className="sr-only">{t("scheduleUploadHelp")}</p>
              <AppleTextFieldGroup>
                <AppleFileField
                  accept=".pdf,.doc,.docx,.csv,.xlsx,.xls"
                  value={form.scheduleFile}
                  onChange={(scheduleFile) => setForm({ ...form, scheduleFile })}
                  chooseLabel={tCommon("chooseFile")}
                  emptyLabel={tCommon("noFileChosen")}
                  clearLabel={tCommon("clear")}
                />
              </AppleTextFieldGroup>
            </div>
            <AppleListSection
              footer={form.awardCriteriaDeferred ? t("awardCriteriaDeferHelp") : undefined}
            >
              <AppleListSwitchRow
                label={t("awardCriteriaDeferLabel")}
                checked={form.awardCriteriaDeferred}
                onChange={(checked) =>
                  setForm({ ...form, awardCriteriaDeferred: checked, awardCriteriaFile: null })
                }
              />
            </AppleListSection>
            {!form.awardCriteriaDeferred ? (
              <AppleTextFieldGroup>
                <AppleFileField
                  accept=".pdf,.doc,.docx,application/pdf"
                  value={form.awardCriteriaFile}
                  onChange={(awardCriteriaFile) => setForm({ ...form, awardCriteriaFile })}
                  chooseLabel={tCommon("chooseFile")}
                  emptyLabel={tCommon("noFileChosen")}
                  clearLabel={tCommon("clear")}
                />
              </AppleTextFieldGroup>
            ) : null}
          </div>
        ) : null}

        {step === "matrix" ? (
          <div className="space-y-5">
            <p className="sr-only">{t("matrixHelp")}</p>
            <AppleListSection>
              <AppleListSwitchRow
                label={t("matrixDeferLabel")}
                checked={form.matrixDeferred}
                onChange={(checked) => setForm({ ...form, matrixDeferred: checked })}
              />
            </AppleListSection>
            <AppleTextFieldGroup>
              <AppleTextAreaField
                placeholder={t("notesPlaceholder")}
                label={t("notesLabel")}
                value={form.notes}
                onChange={(notes) => setForm({ ...form, notes })}
                clearLabel={tCommon("clear")}
              />
            </AppleTextFieldGroup>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="space-y-4">
            <AppleSegmentedControl
              className="w-full min-w-0 overflow-x-auto"
              aria-label={t("menuEditSection")}
              value={null}
              items={STEPS.filter((id) => id !== "review").map((id) => ({
                id,
                label: t(`step_${id}`),
              }))}
              onValueChange={(id) => goToStep(STEPS.indexOf(id as StepId))}
            />

            <AppleListSection header={t("step_contact")}>
              <AppleListRow title={t("contactNameLabel")} detail={form.contactName} />
              <AppleListRow title={t("contactEmailLabel")} detail={form.contactEmail} />
              <AppleListRow title={t("conferenceNameLabel")} detail={form.conferenceName} />
              <AppleListRow
                title={t("conferenceLogoLabel")}
                detail={form.conferenceLogoFile?.name ?? t("errorConferenceLogo")}
              />
              {form.eventDates ? <AppleListRow title={t("eventDatesLabel")} detail={form.eventDates} /> : null}
            </AppleListSection>

            <AppleListSection header={t("step_scale")}>
              <AppleListRow title={t("committeeCountLabel")} detail={String(form.committeeCount)} />
              {form.delegateCount ? (
                <AppleListRow title={t("delegateCountLabel")} detail={form.delegateCount} />
              ) : null}
              {form.chairCount ? (
                <AppleListRow title={t("chairCountLabel")} detail={form.chairCount} />
              ) : null}
            </AppleListSection>

            <AppleListSection header={t("step_features")}>
              {form.selectedFeatures.map((key) => (
                <AppleListRow key={key} title={t(`feature_${key}`)} selected />
              ))}
            </AppleListSection>

            <AppleListSection header={t("step_committees")}>
              {form.committees.map((c, i) => {
                const topics = formatCommitteeTopicsForDisplay(c.topics);
                return (
                  <AppleListRow
                    key={i}
                    title={c.name || t("committeeHeading", { number: i + 1 })}
                    subtitle={topics || undefined}
                  />
                );
              })}
            </AppleListSection>

            <p className="mun-apple-text mun-apple-text-footnote mun-vibrancy-secondary px-1">
              {t("reviewManualNote")}
            </p>
          </div>
        ) : null}
      </div>
    </AppleWindowWithSidebar>

    <AppleConfirmSheet
        open={removeTopicTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTopicTarget(null);
        }}
        title={t("actionSheetRemoveTopicTitle")}
        message={t("actionSheetRemoveTopicMessage")}
        confirmLabel={t("actionSheetRemoveTopicConfirm")}
        cancelLabel={tCommon("cancel")}
        confirmRole="destructive"
        onConfirm={() => {
          if (!removeTopicTarget) return;
          removeCommitteeTopic(removeTopicTarget.committeeIndex, removeTopicTarget.topicIndex);
          setRemoveTopicTarget(null);
        }}
      />

      <AppleConfirmSheet
        open={submitSheetOpen}
        onOpenChange={setSubmitSheetOpen}
        title={t("actionSheetSubmitTitle")}
        message={t("actionSheetSubmitMessage")}
        confirmLabel={t("actionSheetSubmitConfirm")}
        cancelLabel={tCommon("cancel")}
        pending={pending}
        onConfirm={() => {
          void submit();
        }}
      />
    </>
  );
}
