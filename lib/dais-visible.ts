/** First announcement visible on the floor (published, respecting schedule). Rows should be sorted pinned first, then newest. */

export function firstVisibleDaisRow<T extends { publish_at?: string | null }>(rows: T[]): T | null {
  const now = Date.now();
  for (const r of rows) {
    if (!r.publish_at || new Date(r.publish_at).getTime() <= now) return r;
  }
  return null;
}
