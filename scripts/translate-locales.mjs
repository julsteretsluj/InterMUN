/**
 * Machine-translate messages/en.json into each non-English locale file.
 * Preserves ICU-style placeholders like {code}, {appName} when possible.
 *
 * Usage:
 *   node scripts/translate-locales.mjs
 *   node scripts/translate-locales.mjs --locale=de
 *   node scripts/translate-locales.mjs --dry-run
 *
 * Requires network access to Google Translate endpoints (via google-translate-api-x).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { translate } from "google-translate-api-x";

const root = process.cwd();
const messagesDir = path.join(root, "messages");

/** App locale → Google Translate `to` code */
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

function flattenStrings(obj, prefix = "") {
  const out = [];
  if (obj == null) return out;
  if (typeof obj === "string") {
    out.push({ path: prefix, value: obj });
    return out;
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    out.push(...flattenStrings(v, next));
  }
  return out;
}

function setDeep(obj, dotPath, value) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] ??= {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateChunk(texts, to) {
  if (texts.length === 0) return [];
  // Package accepts string arrays and returns TranslationResponse[]
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
  const dryRun = args.includes("--dry-run");
  const localeArg = args.find((a) => a.startsWith("--locale="));
  const onlyLocale = localeArg ? localeArg.split("=")[1]?.trim() : null;

  const enPath = path.join(messagesDir, "en.json");
  const enText = await fs.readFile(enPath, "utf8");
  const en = JSON.parse(enText);
  const flat = flattenStrings(en);

  console.log(`Source: ${flat.length} leaf strings from en.json`);

  const targetLocales = onlyLocale
    ? [onlyLocale]
    : Object.keys(GOOGLE_LANG);

  for (const locale of targetLocales) {
    const googleTo = GOOGLE_LANG[locale];
    if (!googleTo) {
      console.error(`Unknown locale: ${locale}`);
      process.exit(1);
    }

    const outPath = path.join(messagesDir, `${locale}.json`);
    if (dryRun) {
      console.log(`[dry-run] Would translate → ${locale} (${googleTo}) → ${outPath}`);
      continue;
    }

    const texts = flat.map((x) => x.value);
    const translatedParts = [];
    const chunkSize = 45;
    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const part = await translateChunk(chunk, googleTo);
      translatedParts.push(...part);
      await sleep(400);
    }

    if (translatedParts.length !== flat.length) {
      throw new Error(`Length mismatch for ${locale}: ${translatedParts.length} vs ${flat.length}`);
    }

    const rootObj = {};
    flat.forEach((entry, idx) => {
      setDeep(rootObj, entry.path, translatedParts[idx]);
    });

    await fs.writeFile(`${outPath}`, `${JSON.stringify(rootObj, null, 2)}\n`, "utf8");
    console.log(`Wrote ${outPath}`);
    await sleep(800);
  }

  if (dryRun) return;
  console.log("Done. Run: npm run i18n:check");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
