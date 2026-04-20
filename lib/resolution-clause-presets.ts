/** Common preambulatory openings (MUN / UN-style draft resolutions). */
export const PREAMBULATORY_OPENING_PRESETS = [
  "Guided by",
  "Recalling",
  "Reaffirming",
  "Noting with appreciation",
  "Deeply concerned",
  "Deeply disturbed",
  "Alarmed by",
  "Recognizing",
  "Bearing in mind",
  "Expressing concern",
  "Welcoming",
  "Strongly condemning",
  "Aware of",
  "Emphasizing",
  "Noting further",
  "Taking note of",
] as const;

/** Common operative openings. */
export const OPERATIVE_OPENING_PRESETS = [
  "Calls upon",
  "Urges",
  "Encourages",
  "Requests",
  "Demands",
  "Supports",
  "Stresses the importance of",
  "Further invites",
  "Decides",
  "Endorses",
  "Recommends",
  "Calls for",
  "Affirms",
  "Proclaims",
  "Reminds",
  "Strongly encourages",
] as const;

export type ClauseSection = "preambulatory" | "operative";

export function combineClauseSuggestion(openingPhrase: string | null | undefined, clauseBody: string): string {
  const o = (openingPhrase ?? "").trim();
  const b = clauseBody.trim();
  if (!o) return b;
  if (!b) return o.endsWith(",") ? o : `${o},`;
  const prefix = o.endsWith(",") ? o : `${o},`;
  return `${prefix} ${b}`;
}
