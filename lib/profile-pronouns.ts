/** Values stored in `profiles.pronouns` when the user picks a preset. */
export const PROFILE_PRONOUN_PRESETS = [
  "she/her",
  "he/him",
  "they/them",
  "she/they",
  "they/she",
  "he/they",
  "they/he",
  "any pronouns",
  "Ask me",
  "it/its",
  "xe/xem",
  "fae/faer",
  "ey/em",
  "zie/hir",
  "per/per",
  "vo/vos",
  "ae/aer",
  "ne/nym",
  "e/em",
] as const;

export type ProfilePronounPreset = (typeof PROFILE_PRONOUN_PRESETS)[number];

export const PROFILE_PRONOUN_PRESET_SET: ReadonlySet<string> = new Set(
  PROFILE_PRONOUN_PRESETS as unknown as string[]
);

/** Map stored profile pronouns to a select value (only presets; unknown → ""). */
export function pronounsFormValueFromProfile(stored: string | null | undefined): string {
  const t = stored?.trim();
  if (!t) return "";
  return PROFILE_PRONOUN_PRESET_SET.has(t) ? t : "";
}
