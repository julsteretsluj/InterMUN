/**
 * Translate sessionControlClient guided motion flow keys from English.
 *
 * Usage:
 *   node scripts/translate-session-guided-flow.mjs
 *   node scripts/translate-session-guided-flow.mjs --locale=de
 */

import fs from "node:fs/promises";
import path from "node:path";
import { translate } from "google-translate-api-x";

const root = process.cwd();
const messagesDir = path.join(root, "messages");

const GOOGLE_LANG = {
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  "pt-BR": "pt",
  it: "it",
  nl: "nl",
  ru: "ru",
  pl: "pl",
  uk: "uk",
  el: "el",
  tr: "tr",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  th: "th",
  id: "id",
  hi: "hi",
  bn: "bn",
  ar: "ar",
  fa: "fa",
  he: "he",
  sw: "sw",
  mi: "mi",
  km: "km",
  lo: "lo",
  my: "my",
  ms: "ms",
};

const GUIDED_KEYS = [
  "guidedStepChooseProcedure",
  "invalidProcedureSelection",
  "guidedNoAgendaTopics",
  "guidedStepChooseAgendaTopic",
  "guidedInvalidAgendaTopicSelection",
  "guidedStepTopicPurpose",
  "guidedStepTopic",
  "guidedStepTopicOptional",
  "guidedStepMotionTitleOptional",
  "guidedConsultationRequiresTopicOrPurpose",
  "guidedTopicIsRequired",
  "guidedStepMotioner",
  "guidedMotionerNotSpecified",
  "guidedStepDescriptionNotesOptional",
  "guidedRequired",
  "guidedTimingTotalMinutesRequired",
  "guidedModeratedRequiresTopic",
  "guidedModeratedRequiresTotalMinutes",
  "guidedUnmoderatedRequiresTotalMinutes",
  "guidedConsultationRequiresTotalMinutes",
  "guidedTimingTotalMinutesLine",
  "guidedTimingSpeakerSecondsRequired",
  "guidedModeratedRequiresSpeakerSeconds",
  "guidedTimingSpeakerSecondsLine",
  "guidedNoResolutionsForMotion",
  "guidedStepSelectTargetResolution",
  "guidedResolutionSelectionRequired",
  "guidedNoClausesForResolution",
  "guidedStepChooseClauseNumbers",
  "guidedClausePreview",
  "guidedAtLeastOneClauseRequired",
  "guidedSelectAgendaTopic",
  "guidedSetAgendaUnavailableNotEnoughTopics",
  "guidedConfirmRecordStatedMotionNow",
  "guidedDraftLoadedFloorOpen",
  "guidedConfirmCreateOpenMotionNow",
  "guidedDraftLoadedReviewCreate",
];

function maskPlaceholders(s) {
  const placeholders = [];
  const masked = s.replace(/\{[^{}]+\}/g, (m) => {
    const i = placeholders.length;
    placeholders.push(m);
    return `⟦${i}⟧`;
  });
  return { masked, placeholders };
}

function unmask(translated, placeholders) {
  let out = translated;
  for (let i = 0; i < placeholders.length; i++) {
    out = out.replace(new RegExp(`⟦\\s*${i}\\s*⟧`, "g"), placeholders[i]);
    out = out.replace(new RegExp(`\\{\\s*${i}\\s*\\}`, "g"), placeholders[i]);
  }
  if (/⟦\d+⟧/.test(out)) {
    for (let i = 0; i < placeholders.length; i++) {
      out = out.replace(`⟦${i}⟧`, placeholders[i]);
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateBatch(texts, to) {
  if (texts.length === 0) return [];
  const res = await translate(texts, {
    from: "en",
    to,
    forceFrom: true,
    forceTo: true,
    rejectOnPartialFail: false,
  });
  const arr = Array.isArray(res) ? res : [res];
  return arr.map((r, idx) => r?.text ?? texts[idx] ?? "");
}

async function main() {
  const args = process.argv.slice(2);
  const localeArg = args.find((a) => a.startsWith("--locale="));
  const onlyLocale = localeArg ? localeArg.split("=")[1]?.trim() : null;

  const en = JSON.parse(await fs.readFile(path.join(messagesDir, "en.json"), "utf8"));
  const source = en.sessionControlClient ?? {};

  const rows = GUIDED_KEYS
    .map((k) => ({ key: k, value: String(source[k] ?? "") }))
    .filter((r) => r.value.length > 0)
    .map((r) => ({ ...r, ...maskPlaceholders(r.value) }));

  const targetLocales = onlyLocale ? [onlyLocale] : Object.keys(GOOGLE_LANG);
  for (const locale of targetLocales) {
    const to = GOOGLE_LANG[locale];
    if (!to) {
      console.error(`Unknown locale: ${locale}`);
      process.exit(1);
    }

    const p = path.join(messagesDir, `${locale}.json`);
    const data = JSON.parse(await fs.readFile(p, "utf8"));
    if (!data.sessionControlClient) data.sessionControlClient = {};

    const chunkSize = 10;
    const translated = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const part = await translateBatch(chunk.map((r) => r.masked), to);
      for (let j = 0; j < chunk.length; j++) {
        translated[i + j] = unmask(part[j], chunk[j].placeholders);
      }
      await sleep(450);
    }

    for (let i = 0; i < rows.length; i++) {
      data.sessionControlClient[rows[i].key] = translated[i];
    }

    await fs.writeFile(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`${locale}: updated ${rows.length} guided-flow keys`);
    await sleep(650);
  }

  console.log("Done. Run: npm run i18n:check");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

