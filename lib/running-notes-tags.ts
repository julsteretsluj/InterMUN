/**
 * Preset tags for running notes (toggle in UI; users may add custom tags too).
 * First element is the canonical stored value (English, for DB compatibility).
 * Second maps to `runningNotesView.tagPresets.*` message keys.
 */
export const RUNNING_NOTE_TAG_PRESET_ENTRIES = [
  ["Stances", "stances"],
  ["Crisis", "crisis"],
  ["Speech points", "speechPoints"],
  ["POIs & POCs", "poisAndPocs"],
  ["Bloc forming", "blocForming"],
  ["Questions", "questions"],
  ["Informal conversations", "informalConversations"],
] as const;

export type RunningNoteTagPreset = (typeof RUNNING_NOTE_TAG_PRESET_ENTRIES)[number][0];
export type RunningNoteTagPresetI18nKey = (typeof RUNNING_NOTE_TAG_PRESET_ENTRIES)[number][1];

export const RUNNING_NOTE_TAG_PRESETS: readonly RunningNoteTagPreset[] =
  RUNNING_NOTE_TAG_PRESET_ENTRIES.map((e) => e[0]);

const PRESET_ORDER = new Map<string, number>(
  RUNNING_NOTE_TAG_PRESETS.map((t, i) => [t, i])
);

const STORAGE_LOWER_TO_I18N_KEY = new Map<string, RunningNoteTagPresetI18nKey>(
  RUNNING_NOTE_TAG_PRESET_ENTRIES.map(([s, k]) => [s.toLowerCase(), k])
);

/** If `stored` matches a preset (case-insensitive), returns the i18n leaf key under `tagPresets`. */
export function getRunningNoteTagPresetI18nKey(stored: string): RunningNoteTagPresetI18nKey | null {
  return STORAGE_LOWER_TO_I18N_KEY.get(stored.trim().toLowerCase()) ?? null;
}

/** Normalize tags for storage: trim, drop empties, first-wins dedupe by case-insensitive key. */
export function normalizeRunningNoteTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return sortRunningNoteTags(out);
}

export function sortRunningNoteTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const ia = PRESET_ORDER.has(a) ? PRESET_ORDER.get(a)! : 999;
    const ib = PRESET_ORDER.has(b) ? PRESET_ORDER.get(b)! : 999;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

export function runningNoteSidebarLabel(
  note: {
    title?: string | null;
    tags?: string[] | null;
    content?: string | null;
    google_docs_url?: string | null;
  },
  formatTag: (tag: string) => string = (s) => s
): string {
  const name = note.title?.trim();
  if (name) return name.length > 44 ? `${name.slice(0, 41)}…` : name;
  const tags = (note.tags ?? []).filter((t) => Boolean(t?.trim()));
  if (tags.length > 0) {
    const sorted = sortRunningNoteTags(tags.map((t) => t.trim()));
    const line = sorted.slice(0, 2).map(formatTag).join(" · ");
    const suffix = sorted.length > 2 ? "…" : "";
    const s = line + suffix;
    return s.length > 44 ? `${s.slice(0, 41)}…` : s;
  }
  const fallback = (note.content || note.google_docs_url || "Empty").trim() || "Empty";
  return fallback.length > 40 ? `${fallback.slice(0, 37)}…` : `${fallback}…`;
}
