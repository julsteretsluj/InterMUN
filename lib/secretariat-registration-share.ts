// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

type RegistrationShareInput = {
  conferenceName: string;
  contactName: string;
  contactEmail: string;
  eventDates: string;
  committeeCount: number;
  delegateCount: string;
  chairCount: string;
  selectedFeatures: string[];
  committees: Array<{ name: string; topics: string[] }>;
  requestId?: string;
};

type RegistrationShareLabels = {
  contactName: string;
  contactEmail: string;
  eventDates: string;
  committeeCount: string;
  delegateCount: string;
  chairCount: string;
  features: string;
  committees: string;
  requestId: string;
  heading: string;
};

export function buildSecretariatRegistrationShareText(
  input: RegistrationShareInput,
  labels: RegistrationShareLabels,
  featureLabels: Record<string, string>
): string {
  const lines = [
    labels.heading,
    "",
    `${labels.contactName}: ${input.contactName}`,
    `${labels.contactEmail}: ${input.contactEmail}`,
    `${labels.eventDates}: ${input.eventDates || "—"}`,
    `${labels.committeeCount}: ${input.committeeCount}`,
    `${labels.delegateCount}: ${input.delegateCount || "—"}`,
    `${labels.chairCount}: ${input.chairCount || "—"}`,
    `${labels.features}: ${input.selectedFeatures.map((key) => featureLabels[key] ?? key).join(", ")}`,
    `${labels.committees}:`,
    ...input.committees.map((committee) => {
      const topics = committee.topics.map((topic) => topic.trim()).filter(Boolean).join("; ");
      return topics ? `- ${committee.name} (${topics})` : `- ${committee.name}`;
    }),
  ];

  if (input.requestId) {
    lines.push("", `${labels.requestId}: ${input.requestId}`);
  }

  return lines.join("\n");
}

export function buildSecretariatIntakeAdminShareText(
  row: {
    id: string;
    contact_name: string;
    contact_email: string;
    conference_name: string;
    committee_count: number;
    delegate_count: number | null;
    chair_count: number | null;
    rop_status: string;
    schedule_status: string;
    award_criteria_status: string;
    conference_logo_status: string;
    matrix_deferred: boolean;
    submitted_at: string;
  },
  labels: {
    heading: string;
    conference: string;
    contact: string;
    email: string;
    submitted: string;
    committees: string;
    delegates: string;
    chairs: string;
    rop: string;
    schedule: string;
    awardCriteria: string;
    conferenceLogo: string;
    matrix: string;
    matrixDeferred: string;
    matrixReady: string;
    requestId: string;
  }
): string {
  return [
    labels.heading,
    "",
    `${labels.conference}: ${row.conference_name}`,
    `${labels.contact}: ${row.contact_name}`,
    `${labels.email}: ${row.contact_email}`,
    `${labels.submitted}: ${new Date(row.submitted_at).toLocaleString()}`,
    `${labels.committees}: ${row.committee_count}`,
    `${labels.delegates}: ${row.delegate_count ?? "—"}`,
    `${labels.chairs}: ${row.chair_count ?? "—"}`,
    `${labels.rop}: ${row.rop_status.replace(/_/g, " ")}`,
    `${labels.schedule}: ${row.schedule_status.replace(/_/g, " ")}`,
    `${labels.awardCriteria}: ${row.award_criteria_status.replace(/_/g, " ")}`,
    `${labels.conferenceLogo}: ${row.conference_logo_status.replace(/_/g, " ")}`,
    `${labels.matrix}: ${row.matrix_deferred ? labels.matrixDeferred : labels.matrixReady}`,
    "",
    `${labels.requestId}: ${row.id}`,
  ].join("\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareTextNative(title: string, text: string, url?: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false;
  }
}

export function openMailto(subject: string, body: string, to?: string) {
  const params = new URLSearchParams({ subject, body });
  window.location.href = to ? `mailto:${encodeURIComponent(to)}?${params.toString()}` : `mailto:?${params.toString()}`;
}
