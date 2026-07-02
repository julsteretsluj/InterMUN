/**
 * Public app chrome (login, room gate, metadata). Conference-specific titles come from the DB.
 * Override with NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_TAGLINE.
 */

/** App emblem — RGBA PNG (`public/intermun-emblem.png`). Used for UI; square tab icons are `app/icon.png` / `app/apple-icon.png`. */
export const INTERMUN_EMBLEM_PATH = "/intermun-emblem.png";

/** Light-mode variant — rainbow chain wordmark (`public/intermun-emblem-light.png`). */
export const INTERMUN_EMBLEM_LIGHT_PATH = "/intermun-emblem-light.png";

export function getAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "InterMUN";
}

export function getAppTagline(): string {
  return process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Model United Nations platform";
}

export function getAppMetaDescription(): string {
  const custom = process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim();
  if (custom) return custom;
  return `${getAppName()}. Sign in, join your committee room with a room code, and participate in session.`;
}
