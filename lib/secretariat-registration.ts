// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { z } from "zod";

export const SECRETARIAT_FEATURE_KEYS = [
  "floor_control",
  "voting",
  "delegate_prep",
  "allocations_matrix",
  "awards",
  "schedule",
  "advisor_oversight",
  "gate_codes",
  "crisis",
] as const;

export type SecretariatFeatureKey = (typeof SECRETARIAT_FEATURE_KEYS)[number];

export type SecretariatCommitteeDraft = {
  name: string;
  topic: string;
  delegateCount?: number;
  chairCount?: number;
  logoStoragePath?: string;
};

export type IntakeItemStatus = "not_submitted" | "deferred" | "pending_review" | "complete";

export const committeeDraftSchema = z.object({
  name: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(500).optional().default(""),
  delegateCount: z.number().int().min(0).max(9999).optional(),
  chairCount: z.number().int().min(0).max(99).optional(),
  logoStoragePath: z.string().trim().max(500).optional(),
});

export const secretariatRegistrationSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254),
  conferenceName: z.string().trim().min(2).max(200),
  eventDates: z.string().trim().max(120).optional(),
  committeeCount: z.coerce.number().int().min(1).max(64),
  delegateCount: z.coerce.number().int().min(0).max(99999).optional(),
  chairCount: z.coerce.number().int().min(0).max(9999).optional(),
  selectedFeatures: z.array(z.enum(SECRETARIAT_FEATURE_KEYS)).min(1),
  committees: z.array(committeeDraftSchema).min(1),
  awardCriteriaDeferred: z.boolean(),
  matrixDeferred: z.boolean(),
  notes: z.string().trim().max(4000).optional(),
  website: z.string().max(0).optional(),
});

export const MAX_INTAKE_FILE_BYTES = 12 * 1024 * 1024;

export const INTAKE_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export function parseCommitteesJson(raw: string): SecretariatCommitteeDraft[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SecretariatCommitteeDraft[] = [];
    for (const item of parsed) {
      const row = committeeDraftSchema.safeParse(item);
      if (row.success) out.push(row.data);
    }
    return out;
  } catch {
    return [];
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "upload";
}
