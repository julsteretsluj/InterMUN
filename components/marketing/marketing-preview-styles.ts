// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { RollAttendance } from "@/lib/roll-attendance";

/** Root class for roll-call / chair demos inside chamber frames. */
export const MARKETING_CHAMBER_PREVIEW = "marketing-chamber-preview";

const ROLL_CLICKY: Record<RollAttendance, { active: string; inactive: string }> = {
  present_abstain: {
    active:
      "border-[color-mix(in_srgb,#febc2e_55%,var(--clicky-line))] bg-[color-mix(in_srgb,#febc2e_20%,white)] text-[var(--clicky-ink)] shadow-sm",
    inactive:
      "border-[var(--clicky-line)] bg-white text-[var(--clicky-ink-soft)] hover:bg-[var(--clicky-paper)]",
  },
  present_voting: {
    active:
      "border-[color-mix(in_srgb,var(--clicky-mint)_50%,var(--clicky-line))] bg-[color-mix(in_srgb,var(--clicky-mint)_16%,white)] text-[var(--clicky-ink)] shadow-sm",
    inactive:
      "border-[var(--clicky-line)] bg-white text-[var(--clicky-ink-soft)] hover:bg-[var(--clicky-paper)]",
  },
  absent: {
    active:
      "border-[color-mix(in_srgb,var(--clicky-coral)_45%,var(--clicky-line))] bg-[color-mix(in_srgb,var(--clicky-coral)_12%,white)] text-[var(--clicky-ink)] shadow-sm",
    inactive:
      "border-[var(--clicky-line)] bg-white text-[var(--clicky-ink-soft)] hover:bg-[var(--clicky-paper)]",
  },
};

/** Roll-call buttons on marketing session cards — clicky traffic-light tones. */
export function marketingRollAttendanceButtonClass(value: RollAttendance, active: boolean): string {
  const pair = ROLL_CLICKY[value] ?? ROLL_CLICKY.absent;
  return `marketing-roll-btn rounded-full border px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
    active ? pair.active : pair.inactive
  }`;
}

/** Locked light-surface tokens for marketing demos (immune to dark mode). */
export const PREVIEW_CARD =
  "marketing-preview-surface rounded-[var(--clicky-radius)] border border-[var(--clicky-line)] bg-white p-4 text-[var(--clicky-ink)] shadow-[var(--clicky-shadow)] [color-scheme:light]";
export const PREVIEW_LABEL =
  "text-[0.6875rem] font-semibold tracking-[0.06em] text-[var(--clicky-ink-faint)]";
export const PREVIEW_MUTED = "text-sm text-[var(--clicky-ink-soft)]";
export const PREVIEW_HEADING = "font-semibold tracking-[-0.02em] text-[var(--clicky-ink)]";
export const PREVIEW_ROW =
  "flex w-full items-center justify-between rounded-[var(--clicky-radius-sm)] border border-[var(--clicky-line)] bg-[var(--clicky-paper)] px-3 py-2 text-left text-sm text-[var(--clicky-ink)] transition hover:border-[color-mix(in_srgb,var(--clicky-blue)_35%,var(--clicky-line))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clicky-blue)]";

/** Session-floor card chrome — clicky window inset. */
export const MARKETING_SESSION_SURFACE =
  "marketing-session-surface rounded-[var(--clicky-radius)] border border-[var(--clicky-line)] bg-white p-4 text-[var(--clicky-ink)] shadow-[var(--clicky-shadow)] md:p-5";

/** @deprecated Prefer MARKETING_SESSION_SURFACE — kept for role-feature previews. */
export const MARKETING_DARK_GLASS_CARD = MARKETING_SESSION_SURFACE;

/** Nested row / inset inside a session surface card. */
export const MARKETING_SESSION_INSET =
  "rounded-[var(--clicky-radius-sm)] bg-[var(--clicky-paper)]";

/** Nested content island — same theme tokens as the parent session card. */
export const MARKETING_LIGHT_SURFACE =
  "marketing-light-surface rounded-[var(--clicky-radius-sm)] bg-white text-[var(--clicky-ink)]";

/** Session floor labels. */
export const SESSION_FLOOR_LABEL =
  "text-[0.75rem] font-medium text-[var(--clicky-ink-soft)]";

/** Shared secondary / ghost control inside previews. */
export const PREVIEW_BTN_GHOST =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--clicky-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--clicky-ink)] transition hover:bg-[var(--clicky-paper)]";

/** Shared primary control inside previews. */
export const PREVIEW_BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-full bg-[var(--clicky-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--clicky-blue-hover)] disabled:opacity-50";

/** Shared field chrome inside previews. */
export const PREVIEW_FIELD =
  "w-full rounded-[var(--clicky-radius-sm)] border border-[var(--clicky-line)] bg-white px-3 py-2 text-sm text-[var(--clicky-ink)] outline-none transition focus:border-[var(--clicky-blue)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.18)]";
