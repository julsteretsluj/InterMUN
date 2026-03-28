/** Display label for `vote_items.required_majority` (storage stays `simple` | `2/3`). */
export function formatVoteMajorityLabel(requiredMajority: string): string {
  return requiredMajority === "2/3" ? "2/3" : "Simple";
}
