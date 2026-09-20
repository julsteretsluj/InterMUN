// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Namespaces always needed for chrome (theme, language, a11y, errors).
 * Public/marketing routes only hydrate these + MARKETING_NAMESPACES.
 */
export const CORE_MESSAGE_NAMESPACES = [
  "common",
  "language",
  "themeSelector",
  "colorblindMode",
  "notFoundPage",
  "pageTitles",
  "appleColorPicker",
] as const;

/** Public / marketing / auth / gate surfaces. */
export const MARKETING_MESSAGE_NAMESPACES = [
  "marketing",
  "authWizard",
  "eventGateForm",
  "eventGatePage",
  "roomGate",
  "roomGateForm",
  "committeeGate",
  "committeeGateForm",
  "staffBypassForm",
  "allocationCodeGate",
  "allocationCodeGateForm",
  "allocationSignupPage",
  "conferenceSetupForm",
  "conferenceSetupPage",
  "setupPage",
  "seamunConferenceLinks",
  "secretariatRegistration",
] as const;

const PUBLIC_PATH_PREFIXES = [
  "/",
  "/about",
  "/features",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/event-gate",
  "/room-gate",
  "/committee-gate",
  "/allocation-code-gate",
  "/allocation-signup",
  "/conference-setup",
  "/setup",
];

export function isPublicMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || "/";
  if (path === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => {
    if (prefix === "/") return false;
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

export function pickMessageNamespaces(
  all: Record<string, unknown>,
  namespaces: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of namespaces) {
    if (key in all) out[key] = all[key];
  }
  return out;
}

export function publicMessageNamespaces(): string[] {
  return [...new Set([...CORE_MESSAGE_NAMESPACES, ...MARKETING_MESSAGE_NAMESPACES])];
}
