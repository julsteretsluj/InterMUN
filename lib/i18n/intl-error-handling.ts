// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { IntlErrorCode, type IntlError } from "next-intl";

/** Turns `authWizard.termsConsent` into "Terms consent" so a gap never shows a raw key. */
export function humanizeI18nKey(path: string): string {
  const leaf = path.split(".").pop() ?? path;
  const spaced = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return "Missing translation";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function getIntlMessageFallback({
  namespace,
  key,
}: {
  namespace?: string;
  key: string;
}): string {
  return humanizeI18nKey(namespace ? `${namespace}.${key}` : key);
}

/**
 * Development: log every next-intl error so missing keys and broken ICU never
 * fail silently. Production: keep the page rendering with the humanized
 * fallback; only server-side non-missing errors (broken ICU, bad arguments)
 * are logged so they surface in Vercel logs without flooding browsers.
 */
export function onIntlError(error: IntlError): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[i18n] ${error.code}: ${error.originalMessage ?? error.message}`);
    return;
  }
  if (typeof window === "undefined" && error.code !== IntlErrorCode.MISSING_MESSAGE) {
    console.error(`[i18n] ${error.code}: ${error.originalMessage ?? error.message}`);
  }
}
