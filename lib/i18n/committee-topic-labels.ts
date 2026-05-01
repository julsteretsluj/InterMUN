import agendaTopicSlugToKey from "./generated/agenda-topic-slug-to-key.json";
import { applyTopicTitleCaseIfLocale } from "./english-topic-title-case";

type Translator = {
  (key: string, values?: Record<string, string | number | Date>): string;
  has?: (key: string) => boolean;
};

function slugifyLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Strip trailing ellipsis (common when titles are shortened in admin UIs or copy-paste). */
function normalizeTopicLabelForLookup(value: string): string {
  return value
    .trim()
    .replace(/\s*(\.{2,}|…)+\s*$/u, "")
    .trim();
}

const MIN_TOPIC_SLUG_PREFIX = 28;

/** Resolve `agendaTopics` message key from slug; supports truncated DB labels via longest-prefix match. */
function resolveAgendaTopicKey(slug: string): string | undefined {
  for (const candidate of agendaTopicSlugCandidates(slug)) {
    const direct = TOPIC_KEY_BY_SLUG[candidate];
    if (direct) return direct;
  }
  for (const candidate of agendaTopicSlugCandidates(slug)) {
    if (candidate.length < MIN_TOPIC_SLUG_PREFIX) continue;
    let bestSlug: string | null = null;
    for (const mapSlug of Object.keys(TOPIC_KEY_BY_SLUG)) {
      if (mapSlug.startsWith(candidate)) {
        if (!bestSlug || mapSlug.length > bestSlug.length) bestSlug = mapSlug;
      }
    }
    if (bestSlug) return TOPIC_KEY_BY_SLUG[bestSlug];
  }
  for (const candidate of agendaTopicSlugCandidates(slug)) {
    if (candidate.length < MIN_TOPIC_SLUG_PREFIX) continue;
    let bestSlug: string | null = null;
    for (const mapSlug of Object.keys(TOPIC_KEY_BY_SLUG)) {
      if (mapSlug.length >= MIN_TOPIC_SLUG_PREFIX && candidate.startsWith(mapSlug)) {
        if (!bestSlug || mapSlug.length > bestSlug.length) bestSlug = mapSlug;
      }
    }
    if (bestSlug) return TOPIC_KEY_BY_SLUG[bestSlug];
  }
  return undefined;
}

const COMMITTEE_LABEL_KEY_BY_SLUG: Record<string, string> = {
  african_union: "AFRICAN_UNION",
  arab_league: "ARAB_LEAGUE",
  asean: "ASEAN",
  ccpcj: "CCPCJ",
  disec: "DISEC",
  ecofin: "ECOFIN",
  ecosoc: "ECOSOC",
  eu: "EU",
  f1: "F1",
  fifa: "FIFA",
  fantasy_world_committee: "FANTASY_WORLD_COMMITTEE",
  hsc: "HSC",
  hrc: "HRC",
  hcr: "HCR",
  iaea: "IAEA",
  icao: "ICAO",
  icc: "ICC",
  icj: "ICJ",
  interpol: "INTERPOL",
  iopc: "IOPC",
  nato: "NATO",
  press_corps: "PRESS_CORPS",
  us_senate: "US_SENATE",
  sochum: "SOCHUM",
  specpol: "SPECPOL",
  csa: "CSA",
  undp: "UNDP",
  unep: "UNEP",
  unesco: "UNESCO",
  unicef: "UNICEF",
  unodc: "UNODC",
  unsc: "UNSC",
  who: "WHO",
  wipo: "WIPO",
  wto: "WTO",
  un_women: "UN_WOMEN",
  unwomen: "UN_WOMEN",
};

/** From `messages/en.json` agendaTopics via `npm run i18n:generate-agenda-slugs`. */
const TOPIC_KEY_BY_SLUG: Record<string, string> = {
  ...(agendaTopicSlugToKey as Record<string, string>),
};

/** MUN agendas often store topics as "The question of …" / "Topic: …"; strip before slug lookup. */
function agendaTopicSlugCandidates(slug: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  add(slug);
  const prefixes = ["the_question_of_", "question_of_", "topic_"];
  for (const p of prefixes) {
    if (slug.startsWith(p)) add(slug.slice(p.length));
  }
  return out;
}

export function translateCommitteeLabel(
  tCommitteeLabels: Translator,
  rawLabel: string | null | undefined
): string {
  const raw = rawLabel?.trim();
  if (!raw) return "";
  const slug = slugifyLabel(raw);
  const key = COMMITTEE_LABEL_KEY_BY_SLUG[slug];
  if (!key) return raw;
  if (typeof tCommitteeLabels.has === "function" && !tCommitteeLabels.has(key)) return raw;
  return tCommitteeLabels(key);
}

function isAgendaQuestionKey(key: string): boolean {
  return key.startsWith("q") && key.length > 1;
}

/** Strip verbal MUN prefixes from display titles (not already normalized to slug prefixes). */
function extractMunTopicInnerFromBody(body: string): string | null {
  const s = body.trim();
  const patterns = [
    /^\s*the\s+question\s+of\s+/i,
    /^\s*question\s+of\s+/i,
    /^\s*topic\s*:\s*/i,
  ];
  for (const p of patterns) {
    if (p.test(s)) {
      const rest = s.replace(p, "").trim();
      if (rest.length > 0) return rest;
    }
  }
  return null;
}

/** Heuristic: full English question not in catalog — show as-is (no “The question of …” wrapper). */
function looksLikeFullQuestion(text: string): boolean {
  return /^(how|what|why|when|which|who|should|can|could|would|does|did|is|are)\b/i.test(
    text.trim()
  );
}

/**
 * Strip trailing " — COMMITTEE" (MUN agenda lines: DISEC, UNSC, UN WOMEN, …).
 * Strip for slug lookup, then re-append the captured suffix verbatim after translation.
 */
/** EM/en hyphen, non-breaking hyphen, minus sign, ASCII hyphen (committee lines vary by source). */
const TOPIC_COMMITTEE_DASH = /\s*[\u2014\u2013\u2010\u2011\u2212-]\s*/;

function stripTrailingCommitteeSuffix(raw: string): { body: string; suffix: string | null } {
  const m = raw.match(
    new RegExp(`${TOPIC_COMMITTEE_DASH.source}([A-Za-z0-9]+(?:\\s+[A-Za-z0-9]+){0,4})\\s*$`, "u")
  );
  if (!m || m.index === undefined) return { body: raw, suffix: null };
  const suffix = m[1].trim().replace(/\s+/g, " ");
  if (suffix.length < 2 || suffix.length > 36) return { body: raw, suffix: null };
  const lower = suffix.toLowerCase();
  if (/\b(the|and|of|for|with|see|from|subject|question)\b/.test(lower)) {
    return { body: raw, suffix: null };
  }
  return { body: raw.slice(0, m.index).trimEnd(), suffix };
}

export function translateAgendaTopicLabel(
  tAgendaTopics: Translator,
  rawLabel: string | null | undefined,
  locale?: string
): string {
  const raw = rawLabel?.trim();
  if (!raw) return "";
  const { body, suffix } = stripTrailingCommitteeSuffix(raw);
  const normalizedBody = normalizeTopicLabelForLookup(body);
  const initialSlug = slugifyLabel(normalizedBody);
  const verbalInner = extractMunTopicInnerFromBody(normalizedBody);

  let key = resolveAgendaTopicKey(initialSlug);
  if (!key && verbalInner) {
    key = resolveAgendaTopicKey(slugifyLabel(normalizeTopicLabelForLookup(verbalInner)));
  }

  const sourceHadVerbalPrefix = verbalInner !== null;

  const withSuffix = (line: string) =>
    suffix ? `${line} \u2014 ${suffix}` : line;
  const caseTopic = (line: string) => applyTopicTitleCaseIfLocale(line, locale);

  if (key) {
    const inner = tAgendaTopics(key);
    const useWrapper =
      !isAgendaQuestionKey(key) &&
      (sourceHadVerbalPrefix ||
        initialSlug.startsWith("the_question_of_") ||
        initialSlug.startsWith("question_of_") ||
        initialSlug.startsWith("topic_"));
    const line = (() => {
      if (!useWrapper) return inner;
      if (typeof tAgendaTopics.has === "function" && !tAgendaTopics.has("topicQuestionOf")) return inner;
      return tAgendaTopics("topicQuestionOf", { topic: inner });
    })();
    return withSuffix(caseTopic(line));
  }

  if (verbalInner) {
    if (looksLikeFullQuestion(verbalInner)) {
      return withSuffix(caseTopic(verbalInner));
    }
    if (typeof tAgendaTopics.has !== "function" || tAgendaTopics.has("topicQuestionOf")) {
      const line = tAgendaTopics("topicQuestionOf", { topic: verbalInner });
      return withSuffix(caseTopic(line));
    }
  }

  return caseTopic(raw);
}
