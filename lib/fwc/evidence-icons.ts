// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Optional badge art for evidence catalog rows, keyed by Evidence ID slug (e.g. EVD-01).
 * Drop files under public/fwc/evidence/ and register them here.
 */
export const FWC_EVIDENCE_ICONS: Record<string, string> = {
  "EVD-01": "/fwc/evidence/evd-01.jpg",
  "EVD-02": "/fwc/evidence/evd-02.jpg",
  "EVD-03": "/fwc/evidence/evd-03.jpg",
  "EVD-04": "/fwc/evidence/evd-04.jpg",
  "EVD-05": "/fwc/evidence/evd-05.jpg",
  "EVD-06": "/fwc/evidence/evd-06.jpg",
  "EVD-07": "/fwc/evidence/evd-07.jpg",
  "EVD-08": "/fwc/evidence/evd-08.jpg",
  "EVD-09": "/fwc/evidence/evd-09.jpg",
  "EVD-10": "/fwc/evidence/evd-10.jpg",
  "EVD-11": "/fwc/evidence/evd-11.jpg",
  "EVD-12": "/fwc/evidence/evd-12.jpg",
  "EVD-13": "/fwc/evidence/evd-13.jpg",
  "EVD-14": "/fwc/evidence/evd-14.jpg",
  "EVD-15": "/fwc/evidence/evd-15.jpg",
  "EVD-16": "/fwc/evidence/evd-16.jpg",
  "EVD-17": "/fwc/evidence/evd-17.jpg",
  "EVD-18": "/fwc/evidence/evd-18.jpg",
  "EVD-19": "/fwc/evidence/evd-19.jpg",
  "EVD-20": "/fwc/evidence/evd-20.jpg",
  "EVD-21": "/fwc/evidence/evd-21.jpg",
  "EVD-22": "/fwc/evidence/evd-22.jpg",
  "EVD-23": "/fwc/evidence/evd-23.jpg",
  "EVD-24": "/fwc/evidence/evd-24.jpg",
  "EVD-25": "/fwc/evidence/evd-25.jpg",
  "EVD-26": "/fwc/evidence/evd-26.jpg",
};

function normalizeEvidenceSlug(slug: string): string {
  return slug.trim().toUpperCase().replace(/\s+/g, "-");
}

/** Resolve a public icon path for an evidence slug, or null if none is registered. */
export function fwcEvidenceIconSrc(slug: string): string | null {
  const key = normalizeEvidenceSlug(slug);
  if (!key) return null;
  return FWC_EVIDENCE_ICONS[key] ?? null;
}
