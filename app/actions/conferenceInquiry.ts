// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { getPartnershipContactEmail, getAppName } from "@/lib/branding";
import { sendTransactionalEmail } from "@/lib/smtp";

export type ConferenceInquiryState = {
  error?: string;
  success?: boolean;
};

const ROLE_VALUES = ["secretariat", "advisor", "chair", "other"] as const;
const INTEREST_VALUES = ["setup", "branding", "custom_committees", "training", "demo"] as const;

const inquirySchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254),
  role: z.enum(ROLE_VALUES),
  eventDates: z.string().trim().max(120).optional(),
  committeeCount: z.string().trim().max(40).optional(),
  delegateCount: z.string().trim().max(40).optional(),
  message: z.string().trim().max(4000).optional(),
  website: z.string().max(0).optional(),
});

function parseInterests(formData: FormData): string[] {
  return formData
    .getAll("interests")
    .map((v) => String(v))
    .filter((v): v is (typeof INTEREST_VALUES)[number] =>
      (INTEREST_VALUES as readonly string[]).includes(v)
    );
}

function roleLabel(role: (typeof ROLE_VALUES)[number], labels: Record<string, string>): string {
  return labels[role] ?? role;
}

function interestLabels(
  interests: string[],
  labels: Record<string, string>
): string {
  if (interests.length === 0) return labels.none ?? "—";
  return interests.map((key) => labels[key] ?? key).join(", ");
}

export async function submitConferenceInquiryAction(
  _prev: ConferenceInquiryState | null,
  formData: FormData
): Promise<ConferenceInquiryState> {
  const t = await getTranslations("marketing.contact.form");

  const honeypot = String(formData.get("website") ?? "");
  if (honeypot.trim().length > 0) {
    return { success: true };
  }

  const parsed = inquirySchema.safeParse({
    organizationName: formData.get("organizationName"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    role: formData.get("role"),
    eventDates: String(formData.get("eventDates") ?? "").trim() || undefined,
    committeeCount: String(formData.get("committeeCount") ?? "").trim() || undefined,
    delegateCount: String(formData.get("delegateCount") ?? "").trim() || undefined,
    message: String(formData.get("message") ?? "").trim() || undefined,
    website: honeypot,
  });

  if (!parsed.success) {
    return { error: t("errorValidation") };
  }

  const data = parsed.data;
  const interests = parseInterests(formData);
  const appName = getAppName();
  const submittedAt = new Date().toISOString();
  const partnershipEmail = getPartnershipContactEmail();

  if (!partnershipEmail) {
    return { error: t("errorNotConfigured") };
  }

  const roleLabels = {
    secretariat: t("roleSecretariat"),
    advisor: t("roleAdvisor"),
    chair: t("roleChair"),
    other: t("roleOther"),
  };

  const interestLabelMap = {
    setup: t("interestSetup"),
    branding: t("interestBranding"),
    custom_committees: t("interestCustomCommittees"),
    training: t("interestTraining"),
    demo: t("interestDemo"),
    none: t("interestNone"),
  };

  const subject = t("emailSubject", {
    conference: data.organizationName,
    app: appName,
  });

  const text = [
    t("emailIntro", { app: appName }),
    "",
    `${t("fieldOrganization")}: ${data.organizationName}`,
    `${t("fieldContactName")}: ${data.contactName}`,
    `${t("fieldContactEmail")}: ${data.contactEmail}`,
    `${t("fieldRole")}: ${roleLabel(data.role, roleLabels)}`,
    `${t("fieldEventDates")}: ${data.eventDates || "—"}`,
    `${t("fieldCommitteeCount")}: ${data.committeeCount || "—"}`,
    `${t("fieldDelegateCount")}: ${data.delegateCount || "—"}`,
    `${t("fieldInterests")}: ${interestLabels(interests, interestLabelMap)}`,
    "",
    t("fieldMessage"),
    data.message?.trim() ? data.message.trim() : "—",
    "",
    `${t("fieldSubmittedAt")}: ${submittedAt}`,
  ].join("\n");

  const result = await sendTransactionalEmail({
    to: partnershipEmail,
    from: partnershipEmail,
    subject,
    text,
    replyTo: data.contactEmail,
  });

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return { error: t("errorNotConfigured") };
    }
    return { error: t("errorSendFailed") };
  }

  return { success: true };
}
