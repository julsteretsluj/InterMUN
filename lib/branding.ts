/**
 * Public app chrome (login, room gate, metadata). Conference-specific titles come from the DB.
 * Override with NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_TAGLINE.
 */

/** Dark-mode circular emblem with laurel wreath (`public/intermun-emblem.png`). Tab icons: `app/icon.png` / `app/apple-icon.png`. */
export const INTERMUN_EMBLEM_PATH = "/intermun-emblem.png";

/** Light-mode rainbow chain wordmark (`public/intermun-emblem-light.png`). */
export const INTERMUN_EMBLEM_LIGHT_PATH = "/intermun-emblem-light.png?v=2";

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "InterMUN";
}

export function getAppTagline(): string {
  return process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Model United Nations platform";
}

/** General inquiries and conference customization requests. */
export const INQUIRY_EMAIL = "juleskittoastrop@gmail.com";

export function getAppMetaDescription(): string {
  const custom = process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim();
  if (custom) return custom;
  return `${getAppName()}. Sign in, join your committee room with a room code, and participate in session.`;
}
