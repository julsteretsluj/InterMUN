// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Official SEAMUN conference websites (not InterMUN app URLs).
 *
 * Main site uses apex `https://seamun.com` (no `www` — matches live marketing + auth BCC domain).
 * Committee portals live at `https://{slug}.seamun.com` (verified for SEAMUN I 2027 chambers).
 */

/** Public marketing / conference hub. */
export const SEAMUN_SITE_URL = "https://seamun.com";

/**
 * Exact `conferences.committee` labels → subdomain slug for SEAMUN I 2027.
 * Prefer this table over auto-slug so multi-word chambers match live portals
 * (`presscorps`, `unwomen`, `fwc` — not hyphenated).
 */
export const SEAMUN_I_2027_COMMITTEE_SITE_SLUGS: Readonly<Record<string, string>> = {
  UNHRC: "unhrc",
  DISEC: "disec",
  "Press Corps": "presscorps",
  WHO: "who",
  "UN Women": "unwomen",
  UNSC: "unsc",
  ECOSOC: "ecosoc",
  UNODC: "unodc",
  Interpol: "interpol",
  INTERPOL: "interpol",
  "FWC - Stranger Things": "fwc",
  FWC: "fwc",
} as const;

const SLUG_BY_NORMALIZED = new Map<string, string>();
for (const [label, slug] of Object.entries(SEAMUN_I_2027_COMMITTEE_SITE_SLUGS)) {
  SLUG_BY_NORMALIZED.set(normalizeCommitteeKey(label), slug);
}

function normalizeCommitteeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Fallback when a chamber is not in the mapping table: lowercase alphanumerics only. */
export function slugifySeamunCommitteeLabel(committee: string): string {
  return committee
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve the committee portal subdomain slug, or null when the label is empty /
 * secretariat-style (no chamber portal).
 */
export function seamunCommitteeSiteSlug(committee: string | null | undefined): string | null {
  const raw = committee?.trim();
  if (!raw) return null;
  const key = normalizeCommitteeKey(raw);
  if (key === "smt" || key.includes("secretariat") || key.startsWith("seamun")) return null;
  const mapped = SLUG_BY_NORMALIZED.get(key);
  if (mapped) return mapped;
  const fallback = slugifySeamunCommitteeLabel(raw);
  return fallback.length > 0 ? fallback : null;
}

export function seamunCommitteeSiteUrl(committee: string | null | undefined): string | null {
  const slug = seamunCommitteeSiteSlug(committee);
  return slug ? `https://${slug}.seamun.com` : null;
}

/**
 * Chairs and delegates (including SMT previewing those surfaces) see the committee portal.
 * Advisors and secretariat/SMT (and platform admins) get the main site only.
 */
export function seamunConferenceLinksIncludeCommitteeSite(
  role: string | null | undefined
): boolean {
  const r = role?.toString().trim().toLowerCase();
  return r === "chair" || r === "delegate";
}

export type SeamunConferenceLinkSet = {
  mainSiteUrl: string;
  committeeSiteUrl: string | null;
  committeeSlug: string | null;
};

export function resolveSeamunConferenceLinks(opts: {
  role: string | null | undefined;
  committee: string | null | undefined;
}): SeamunConferenceLinkSet {
  const includeCommittee = seamunConferenceLinksIncludeCommitteeSite(opts.role);
  const slug = includeCommittee ? seamunCommitteeSiteSlug(opts.committee) : null;
  return {
    mainSiteUrl: SEAMUN_SITE_URL,
    committeeSiteUrl: slug ? `https://${slug}.seamun.com` : null,
    committeeSlug: slug,
  };
}
