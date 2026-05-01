import { translateAgendaTopicLabel, translateCommitteeLabel } from "@/lib/i18n/committee-topic-labels";

type HeadlineTranslator = {
  (key: string, values?: Record<string, string | number | Date>): string;
  has?: (key: string) => boolean;
};

/**
 * Localize strings built like `[conference.name, committee, tagline].join(" — ")`.
 * First segment is treated as the agenda/topic title; second as the committee/chamber code or label.
 * Any further segments (e.g. tagline) are appended unchanged.
 */
export function translateConferenceHeadline(
  tTopics: HeadlineTranslator,
  tCommitteeLabels: HeadlineTranslator,
  raw: string | null | undefined,
  locale?: string
): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  const parts = trimmed
    .split(/\s*[\u2014\u2013\u2010\u2011\u2212-]\s*/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";

  const topic = translateAgendaTopicLabel(tTopics, parts[0], locale);
  if (parts.length === 1) return topic;

  const committee = translateCommitteeLabel(tCommitteeLabels, parts[1]);
  const head = `${topic} \u2014 ${committee}`;
  if (parts.length === 2) return head;

  const tail = parts.slice(2).join(" — ");
  return `${head} \u2014 ${tail}`;
}
