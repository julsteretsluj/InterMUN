// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getSecretariatRegistrationNotifyEmails, getAppName } from "@/lib/branding";
import { sendTransactionalEmail } from "@/lib/smtp";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  INTAKE_FILE_TYPES,
  MAX_INTAKE_FILE_BYTES,
  SECRETARIAT_FEATURE_KEYS,
  parseCommitteesJson,
  sanitizeFileName,
  secretariatRegistrationSchema,
  type SecretariatFeatureKey,
} from "@/lib/secretariat-registration";

export type SecretariatRegistrationState = {
  error?: string;
  success?: boolean;
  requestId?: string;
};

function parseFeatures(formData: FormData): SecretariatFeatureKey[] {
  return formData
    .getAll("selectedFeatures")
    .map((v) => String(v))
    .filter((v): v is SecretariatFeatureKey =>
      (SECRETARIAT_FEATURE_KEYS as readonly string[]).includes(v)
    );
}

function isAllowedFile(file: File): boolean {
  if (!file.size || file.size > MAX_INTAKE_FILE_BYTES) return false;
  const type = file.type || "application/octet-stream";
  return (INTAKE_FILE_TYPES as readonly string[]).includes(type) || type === "application/octet-stream";
}

async function uploadIntakeFile(
  requestId: string,
  folder: string,
  file: File
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  if (!isAllowedFile(file)) return null;

  const objectPath = `${requestId}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("secretariat-onboarding").upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return null;
  return objectPath;
}

function featureLabels(
  features: SecretariatFeatureKey[],
  labels: Record<string, string>
): string {
  return features.map((key) => labels[key] ?? key).join(", ");
}

export async function submitSecretariatRegistrationAction(
  _prev: SecretariatRegistrationState | null,
  formData: FormData
): Promise<SecretariatRegistrationState> {
  const t = await getTranslations("secretariatRegistration");

  const honeypot = String(formData.get("website") ?? "");
  if (honeypot.trim().length > 0) {
    return { success: true };
  }

  const committees = parseCommitteesJson(String(formData.get("committeesJson") ?? "[]"));
  const awardCriteriaDeferred = formData.get("awardCriteriaDeferred") === "true";
  const matrixDeferred = formData.get("matrixDeferred") !== "false";

  const parsed = secretariatRegistrationSchema.safeParse({
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    conferenceName: formData.get("conferenceName"),
    eventDates: String(formData.get("eventDates") ?? "").trim() || undefined,
    committeeCount: formData.get("committeeCount"),
    delegateCount: String(formData.get("delegateCount") ?? "").trim() || undefined,
    chairCount: String(formData.get("chairCount") ?? "").trim() || undefined,
    selectedFeatures: parseFeatures(formData),
    committees,
    awardCriteriaDeferred,
    matrixDeferred,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    website: honeypot,
  });

  if (!parsed.success) {
    return { error: t("errorValidation") };
  }

  const data = parsed.data;
  if (data.committees.length !== data.committeeCount) {
    return { error: t("errorCommitteeMismatch") };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { error: t("errorNotConfigured") };
  }

  const ropFile = formData.get("ropFile");
  const scheduleFile = formData.get("scheduleFile");
  const awardFile = formData.get("awardCriteriaFile");

  const hasRop = ropFile instanceof File && ropFile.size > 0;
  const hasSchedule = scheduleFile instanceof File && scheduleFile.size > 0;
  const hasAward = !awardCriteriaDeferred && awardFile instanceof File && awardFile.size > 0;

  const { data: row, error: insertError } = await admin
    .from("secretariat_registration_requests")
    .insert({
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      conference_name: data.conferenceName,
      event_dates: data.eventDates ?? null,
      committee_count: data.committeeCount,
      delegate_count: data.delegateCount ?? null,
      chair_count: data.chairCount ?? null,
      selected_features: data.selectedFeatures,
      committees: data.committees,
      award_criteria_deferred: awardCriteriaDeferred,
      matrix_deferred: matrixDeferred,
      rop_status: hasRop ? "pending_review" : "not_submitted",
      award_criteria_status: awardCriteriaDeferred
        ? "deferred"
        : hasAward
          ? "pending_review"
          : "not_submitted",
      schedule_status: hasSchedule ? "pending_review" : "not_submitted",
      notes: data.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !row?.id) {
    return { error: t("errorSaveFailed") };
  }

  const requestId = row.id as string;
  const committeesWithLogos = [...data.committees];

  for (let i = 0; i < committeesWithLogos.length; i++) {
    const logo = formData.get(`committeeLogo_${i}`);
    if (logo instanceof File && logo.size > 0 && logo.type.startsWith("image/")) {
      const path = await uploadIntakeFile(requestId, `committee-logos/${i}`, logo);
      if (path) committeesWithLogos[i] = { ...committeesWithLogos[i]!, logoStoragePath: path };
    }
  }

  const ropPath = hasRop ? await uploadIntakeFile(requestId, "rop", ropFile as File) : null;
  const schedulePath = hasSchedule
    ? await uploadIntakeFile(requestId, "schedule", scheduleFile as File)
    : null;
  const awardPath = hasAward ? await uploadIntakeFile(requestId, "award-criteria", awardFile as File) : null;

  await admin
    .from("secretariat_registration_requests")
    .update({
      committees: committeesWithLogos,
      rop_storage_path: ropPath,
      schedule_storage_path: schedulePath,
      award_criteria_storage_path: awardPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  const appName = getAppName();
  const notifyEmails = getSecretariatRegistrationNotifyEmails();
  const featureLabelMap = Object.fromEntries(
    SECRETARIAT_FEATURE_KEYS.map((key) => [key, t(`feature_${key}`)])
  );

  const committeeLines = committeesWithLogos
    .map((c, i) => {
      const parts = [
        `${i + 1}. ${c.name}`,
        c.topic ? `topic: ${c.topic}` : null,
        c.delegateCount != null ? `delegates: ${c.delegateCount}` : null,
        c.chairCount != null ? `chairs: ${c.chairCount}` : null,
        c.logoStoragePath ? "logo: uploaded" : null,
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .join("\n");

  const staffText = [
    t("staffEmailIntro", { app: appName }),
    "",
    `${t("fieldContactName")}: ${data.contactName}`,
    `${t("fieldContactEmail")}: ${data.contactEmail}`,
    `${t("fieldConference")}: ${data.conferenceName}`,
    `${t("fieldEventDates")}: ${data.eventDates || "—"}`,
    `${t("fieldCommitteeCount")}: ${data.committeeCount}`,
    `${t("fieldDelegateCount")}: ${data.delegateCount ?? "—"}`,
    `${t("fieldChairCount")}: ${data.chairCount ?? "—"}`,
    `${t("fieldFeatures")}: ${featureLabels(data.selectedFeatures, featureLabelMap)}`,
    "",
    t("fieldCommittees"),
    committeeLines || "—",
    "",
    `${t("fieldRop")}: ${hasRop ? t("statusPendingReview") : t("statusNotSubmitted")}`,
    `${t("fieldSchedule")}: ${hasSchedule ? t("statusPendingReview") : t("statusNotSubmitted")}`,
    `${t("fieldAwardCriteria")}: ${
      awardCriteriaDeferred
        ? t("statusDeferred")
        : hasAward
          ? t("statusPendingReview")
          : t("statusNotSubmitted")
    }`,
    `${t("fieldMatrix")}: ${matrixDeferred ? t("statusDeferred") : t("statusReadyNow")}`,
    "",
    t("fieldNotes"),
    data.notes?.trim() ? data.notes.trim() : "—",
    "",
    `${t("fieldRequestId")}: ${requestId}`,
  ].join("\n");

  if (notifyEmails.length > 0) {
    await sendTransactionalEmail({
      to: notifyEmails.join(", "),
      subject: t("staffEmailSubject", { conference: data.conferenceName, app: appName }),
      text: staffText,
      replyTo: data.contactEmail,
    });
  }

  const submitterLines = [
    t("confirmEmailIntro", { app: appName, conference: data.conferenceName }),
    "",
    hasRop || hasSchedule
      ? t("confirmEmailManualProcessing")
      : t("confirmEmailNoUploads"),
    awardCriteriaDeferred ? t("confirmEmailAwardDeferred") : null,
    matrixDeferred ? t("confirmEmailMatrixDeferred") : t("confirmEmailMatrixReady"),
    "",
    t("confirmEmailOutro"),
  ]
    .filter(Boolean)
    .join("\n");

  await sendTransactionalEmail({
    to: data.contactEmail,
    subject: t("confirmEmailSubject", { app: appName }),
    text: submitterLines,
  });

  return { success: true, requestId };
}
