type VoteTypeTranslator = {
  (key: string, values?: Record<string, string | number | Date>): string;
  has?: (key: string) => boolean;
};

/** Localized label for `vote_items.vote_type` (motion / amendment / resolution). Uses `voting.voteTypes.*`. */
export function formatVoteTypeLabel(t: VoteTypeTranslator, voteType: string | null | undefined): string {
  const raw = (voteType ?? "motion").trim().toLowerCase() || "motion";
  if (raw === "motion" || raw === "amendment" || raw === "resolution" || raw === "agenda") {
    const key = `voteTypes.${raw}`;
    if (typeof t.has === "function" && !t.has(key)) {
      return raw.replace(/_/g, " ");
    }
    return t(key);
  }
  const legacy = voteType?.trim();
  if (!legacy) return "—";
  return legacy.charAt(0).toUpperCase() + legacy.slice(1).replace(/_/g, " ");
}
