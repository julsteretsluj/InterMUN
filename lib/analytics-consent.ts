// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Optional marketing analytics. Auth and conference cookies are separate and stay on. */
export const ANALYTICS_CONSENT_KEY = "intermun-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "intermun:analytics-consent";

export type AnalyticsConsent = "granted" | "denied";

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    /* private mode */
  }
  return null;
}

export function writeAnalyticsConsent(value: AnalyticsConsent) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
}
