// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Public app chrome (login, room gate, metadata). Conference-specific titles come from the DB.
 * Override with NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_TAGLINE.
 */

/** Dark-mode white gavel-and-ring emblem (`public/intermun-emblem.png`). Tab icons: `app/icon.png` / `app/apple-icon.png`. */
export const INTERMUN_EMBLEM_PATH = "/intermun-emblem.png?v=4";

/** Light-mode gavel-and-ring emblem — synced from `app/lightintermun.PNG` (transparent PNG). */
export const INTERMUN_EMBLEM_LIGHT_PATH = "/intermun-emblem-light.png?v=4";

/** Dark-mode horizontal wordmark — gavel + intermun.site (`public/intermun-wordmark-dark.png`). */
export const INTERMUN_WORDMARK_DARK_PATH = "/intermun-wordmark-dark.png?v=1";

/** Light-mode horizontal wordmark — navy gavel + intermun.site (`public/intermun-wordmark-light.png`). */
export const INTERMUN_WORDMARK_LIGHT_PATH = "/intermun-wordmark-light.png?v=1";

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "InterMUN";
}

export function getAppTagline(): string {
  return process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "The whole conference team, in one tab.";
}

/** General inquiries, commercial licensing, and conference partnership requests. */
export function getPartnershipContactEmail(): string {
  return (
    process.env.PARTNERSHIP_CONTACT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_PARTNERSHIP_CONTACT_EMAIL?.trim() ||
    "juleskittoastrop@gmail.com"
  );
}

/** Staff inbox(es) for new secretariat registration submissions. */
export function getSecretariatRegistrationNotifyEmails(): string[] {
  const emails = new Set<string>();
  const addList = (raw?: string) => {
    for (const part of (raw ?? "").split(",")) {
      const email = part.trim();
      if (email) emails.add(email);
    }
  };

  addList(process.env.SECRETARIAT_REGISTRATION_NOTIFY_EMAIL);
  addList(getPartnershipContactEmail());
  emails.add("juleskittoastrop@gmail.com");

  return [...emails];
}

/** @deprecated Use getPartnershipContactEmail() */
export function getInquiryEmail(): string {
  return getPartnershipContactEmail();
}

export function getAppMetaDescription(): string {
  const custom = process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim();
  if (custom) return custom;
  return `${getAppName()}. Sign in, join your committee room with a room code, and participate in session.`;
}
