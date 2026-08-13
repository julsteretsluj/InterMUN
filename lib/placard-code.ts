// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Conference branding on printed placards — stored codes omit this. */
const EVENT_PLACARD_PREFIX = /^SEAMUN-\d{4}-/i;
const STANDARD_STEM_CODE = /^(?:[A-Z]{2,6}|DAIS)-\d{2,4}$/i;

/** Drop `SEAMUN-2027-` so ECO-001 and SEAMUN-2027-ECO-001 are the same seat code. */
export function canonicalPlacardCode(raw: string | null | undefined): string {
  const stripped = String(raw ?? "")
    .trim()
    .replace(EVENT_PLACARD_PREFIX, "");
  if (!stripped) return "";
  if (STANDARD_STEM_CODE.test(stripped)) return stripped.toUpperCase();
  return stripped;
}

export function placardCodesMatch(
  stored: string | null | undefined,
  entered: string | null | undefined
): boolean {
  const a = canonicalPlacardCode(stored).toUpperCase();
  const b = canonicalPlacardCode(entered).toUpperCase();
  return Boolean(a) && a === b;
}
