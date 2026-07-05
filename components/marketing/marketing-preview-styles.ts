import type { RollAttendance } from "@/lib/roll-attendance";

/** Root class for roll-call / chair demos inside `mun-chamber-frame-dark`. */
export const MARKETING_CHAMBER_PREVIEW = "marketing-chamber-preview";

/** Roll-call buttons on dark chamber glass — always light label text. */
const ROLL_BTN_ON_DARK: Record<RollAttendance, { active: string; inactive: string }> = {
  present_abstain: {
    active: "border-amber-400/70 bg-amber-500/45 text-amber-50 shadow-sm",
    inactive: "border-amber-400/40 bg-amber-500/12 text-amber-100 hover:bg-amber-500/22",
  },
  present_voting: {
    active: "border-emerald-400/70 bg-emerald-500/45 text-emerald-50 shadow-sm",
    inactive: "border-emerald-400/40 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/22",
  },
  absent: {
    active: "border-rose-400/70 bg-rose-500/45 text-rose-50 shadow-sm",
    inactive: "border-rose-400/40 bg-rose-500/12 text-rose-100 hover:bg-rose-500/22",
  },
};

export function marketingRollAttendanceButtonClass(value: RollAttendance, active: boolean): string {
  const pair = ROLL_BTN_ON_DARK[value];
  return `marketing-roll-btn rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
    active ? pair.active : pair.inactive
  }`;
}

/** Locked light-surface tokens for marketing demos (immune to dark mode). */
export const PREVIEW_CARD =
  "marketing-preview-surface rounded-2xl border border-zinc-200/90 bg-white p-4 text-zinc-900 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] [color-scheme:light]";
export const PREVIEW_LABEL = "text-xs font-semibold uppercase tracking-wide text-zinc-500";
export const PREVIEW_MUTED = "text-sm text-zinc-500";
export const PREVIEW_HEADING = "font-display font-semibold text-zinc-900";
export const PREVIEW_ROW =
  "flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-900 transition hover:border-[color-mix(in_srgb,var(--accent)_35%,#d4d4d8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
export const MARKETING_DARK_GLASS_CARD =
  "rounded-xl border border-white/15 bg-black/25 p-4 shadow-sm backdrop-blur-sm";

/** Session-floor glass card inside marketing chamber previews. */
export const MARKETING_SESSION_SURFACE =
  "marketing-session-surface rounded-xl border border-white/15 bg-black/25 p-4 text-brand-navy shadow-sm backdrop-blur-sm";

/** Light card island inside dark marketing session surfaces — keeps dark copy readable. */
export const MARKETING_LIGHT_SURFACE =
  "marketing-light-surface rounded-lg border border-zinc-200/90 bg-white text-zinc-900 [color-scheme:light]";

/** Session floor labels — matches chair session control / speaker queue panel. */
export const SESSION_FLOOR_LABEL = "text-xs font-medium uppercase tracking-wide text-brand-muted";
