// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { RollAttendance } from "@/lib/roll-attendance";
import { ROLL_ATTENDANCE_BUTTONS } from "@/lib/roll-call-attendance-buttons";

/** Root class for roll-call / chair demos inside chamber frames. */
export const MARKETING_CHAMBER_PREVIEW = "marketing-chamber-preview";

/** Roll-call buttons on marketing session cards (theme-aware surfaces). */
export function marketingRollAttendanceButtonClass(value: RollAttendance, active: boolean): string {
  const pair = ROLL_ATTENDANCE_BUTTONS.find((b) => b.value === value);
  const tone = pair
    ? active
      ? pair.activeClass
      : pair.inactiveClass
    : "border-zinc-300 bg-zinc-100 text-zinc-800";
  return `marketing-roll-btn rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm ${tone}`;
}

/** Locked light-surface tokens for marketing demos (immune to dark mode). */
export const PREVIEW_CARD =
  "marketing-preview-surface rounded-2xl border border-zinc-200/90 bg-white p-4 text-zinc-900 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] [color-scheme:light]";
export const PREVIEW_LABEL = "text-xs font-semibold uppercase tracking-wide text-zinc-500";
export const PREVIEW_MUTED = "text-sm text-zinc-500";
export const PREVIEW_HEADING = "font-display font-semibold text-zinc-900";
export const PREVIEW_ROW =
  "flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-900 transition hover:border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/** Session-floor card chrome — matches live chair `surfaceCard` / dashboard tokens. */
export const MARKETING_SESSION_SURFACE =
  "marketing-session-surface rounded-xl border border-[var(--hairline)] bg-[var(--dashboard-card)] p-4 text-brand-navy shadow-sm backdrop-blur-sm";

/** @deprecated Prefer MARKETING_SESSION_SURFACE — kept for role-feature previews. */
export const MARKETING_DARK_GLASS_CARD = MARKETING_SESSION_SURFACE;

/** Nested row / inset inside a session surface card. */
export const MARKETING_SESSION_INSET =
  "rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)]";

/** Nested content island — same theme tokens as the parent session card. */
export const MARKETING_LIGHT_SURFACE =
  "marketing-light-surface rounded-lg border border-[var(--hairline)] bg-[var(--dashboard-card)] text-brand-navy";

/** Session floor labels — matches chair session control / speaker queue panel. */
export const SESSION_FLOOR_LABEL = "text-xs font-medium uppercase tracking-wide text-brand-muted";
