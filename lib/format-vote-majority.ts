// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Display label for `vote_items.required_majority` (storage stays `simple` | `2/3`). */
export function formatVoteMajorityLabel(requiredMajority: string): string {
  return requiredMajority === "2/3" ? "2/3" : "Simple";
}
