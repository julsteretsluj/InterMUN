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
  "chromePreferences",
  "dashboardTopBar",
  "notFoundPage",
  "pageTitles",
  "appleColorPicker",
] as const;

/**
 * Catalogs only needed on public / setup / gate surfaces. Authenticated app
 * shells omit these on every navigation to cut RSC + client payload.
 */
export const APP_DEFERRED_MESSAGE_NAMESPACES = [
  "marketing",
  "secretariatRegistration",
  "conferenceSetupForm",
  "conferenceSetupPage",
  "setupPage",
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
  "seamunConferenceLinks",
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
  // Interactive marketing demos (home + /features/*) reuse live panel copy
  "smtOverview",
  "committeeTags",
  "committeeNames",
  "sessionControlClient",
  "session",
  "smtConferenceSettings",
  "smtRoomCodesClient",
  "smtRoomCodesPage",
  "voting",
  "chairSpeakerQueuePanel",
  "documents",
  "speeches",
  "stances",
  "chairNominationsPanel",
  "chairAwardsDelegateMatrix",
  "awardsRubric",
  "roleSetupChecklist",
  "allocationMatrixManager",
  "delegateResolutionBuilder",
  "guides",
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

/** Drop deferred namespaces from the full catalog for authenticated app routes. */
export function omitDeferredAppNamespaces(
  all: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...all };
  for (const key of APP_DEFERRED_MESSAGE_NAMESPACES) {
    delete out[key];
  }
  return out;
}
