/**
 * Re-translate the agendaTopics block in each messages/*.json file from English.
 * Preserves `{topic}` and other `{placeholder}` segments by masking during translation.
 *
 * Usage:
 *   node scripts/translate-agenda-topics.mjs
 *   node scripts/translate-agenda-topics.mjs --locale=de
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

  const enPath = path.join(messagesDir, "en.json");
  const en = JSON.parse(await fs.readFile(enPath, "utf8"));
  const sourceTopics = en.agendaTopics;
  if (!sourceTopics || typeof sourceTopics !== "object") {
    console.error("en.json missing agendaTopics");
    process.exit(1);
  }

  const keys = Object.keys(sourceTopics);
  const rows = keys.map((key) => ({
    key,
    ...maskPlaceholders(sourceTopics[key]),
  }));

  const targetLocales = onlyLocale ? [onlyLocale] : Object.keys(GOOGLE_LANG);

  for (const locale of targetLocales) {
    const googleTo = GOOGLE_LANG[locale];
    if (!googleTo) {
      console.error(`Unknown locale: ${locale}`);
      process.exit(1);
    }

    const outPath = path.join(messagesDir, `${locale}.json`);
    const data = JSON.parse(await fs.readFile(outPath, "utf8"));
    if (!data.agendaTopics) data.agendaTopics = {};

    const masked = rows.map((r) => r.masked);
    const translatedParts = [];
    const chunkSize = 6;
    for (let i = 0; i < masked.length; i += chunkSize) {
      const chunk = masked.slice(i, i + chunkSize);
      const part = await translateBatch(chunk, googleTo);
      translatedParts.push(...part);
      await sleep(450);
    }

    if (translatedParts.length !== rows.length) {
      throw new Error(`Length mismatch for ${locale}`);
    }

    const nextTopics = {};
    for (let i = 0; i < rows.length; i++) {
      nextTopics[rows[i].key] = unmask(translatedParts[i], rows[i].placeholders);
    }

    data.agendaTopics = nextTopics;
    await fs.writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`${locale}: updated agendaTopics (${keys.length} keys)`);
    await sleep(700);
  }

  console.log("Done. Run: npm run i18n:check");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
