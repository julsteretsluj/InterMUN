/**
 * Translate only leaf strings that still match English in each locale file.
 * Preserves `{placeholder}` tokens by masking them during translation.
 *
 * Usage:
 *   node scripts/translate-locale-gaps.mjs
 *   node scripts/translate-locale-gaps.mjs --locale=de
 *   node scripts/translate-locale-gaps.mjs --dry-run
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

/** Keep English (abbreviations, codes, or already-universal tokens). */
function shouldSkipValue(value) {
  const v = value.trim();
  if (v.length === 0) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^[\d\s.,:;%+€$£¥\\/-]+$/.test(v)) return true;
  if (/^[A-Z0-9]{1,6}$/.test(v)) return true;
  return false;
}

/** next-intl ICU plural/select — do not machine-translate whole string. */
function isComplexIcu(value) {
  return /,\s*plural\s*,/.test(value) || /,\s*select\s*,/.test(value);
}

function flattenStrings(obj, prefix = "") {
  const out = [];
  if (obj == null) return out;
  if (typeof obj === "string") {
    out.push({ path: prefix, value: obj });
    return out;
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, val] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    out.push(...flattenStrings(val, next));
  }
  return out;
}

function getDeep(obj, dotPath) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[k];
  }
  return cur;
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

function maskIcu(s) {
  const placeholders = [];
  const masked = s.replace(/\{[^{}]+\}/g, (m) => {
    const i = placeholders.length;
    placeholders.push(m);
    return `⟦${i}⟧`;
  });
  return { masked, placeholders };
}

function unmaskIcu(translated, placeholders) {
  let out = translated;
  for (let i = 0; i < placeholders.length; i++) {
    const re = new RegExp(`⟦\\s*${i}\\s*⟧`, "g");
    out = out.replace(re, placeholders[i]);
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

async function translateChunk(texts, to) {
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
  const dryRun = args.includes("--dry-run");
  const localeArg = args.find((a) => a.startsWith("--locale="));
  const onlyLocale = localeArg ? localeArg.split("=")[1]?.trim() : null;

  const enPath = path.join(messagesDir, "en.json");
  const en = JSON.parse(await fs.readFile(enPath, "utf8"));
  const enFlat = flattenStrings(en);
  const enByPath = new Map(enFlat.map((e) => [e.path, e.value]));

  const targetLocales = onlyLocale ? [onlyLocale] : Object.keys(GOOGLE_LANG);

  for (const locale of targetLocales) {
    const googleTo = GOOGLE_LANG[locale];
    if (!googleTo) {
      console.error(`Unknown locale: ${locale}`);
      process.exit(1);
    }

    const outPath = path.join(messagesDir, `${locale}.json`);
    const locJson = JSON.parse(await fs.readFile(outPath, "utf8"));

    const gaps = [];
    for (const { path: p, value: enVal } of enFlat) {
      if (typeof enVal !== "string") continue;
      const locVal = getDeep(locJson, p);
      if (typeof locVal !== "string") continue;
      if (locVal !== enVal) continue;
      if (shouldSkipValue(enVal)) continue;
      if (isComplexIcu(enVal)) continue;
      gaps.push({ path: p, value: enVal });
    }

    console.log(`${locale}: ${gaps.length} strings to translate (still matching English)`);

    if (dryRun || gaps.length === 0) continue;

    const maskedRows = gaps.map((g) => {
      const { masked, placeholders } = maskIcu(g.value);
      return { ...g, masked, placeholders };
    });

    const chunkSize = 25;
    const translatedMasked = [];
    for (let i = 0; i < maskedRows.length; i += chunkSize) {
      const chunk = maskedRows.slice(i, i + chunkSize);
      const texts = chunk.map((c) => c.masked);
      const part = await translateChunk(texts, googleTo);
      translatedMasked.push(...part);
      await sleep(550);
    }

    if (translatedMasked.length !== maskedRows.length) {
      throw new Error(`Length mismatch ${locale}`);
    }

    for (let i = 0; i < maskedRows.length; i++) {
      const row = maskedRows[i];
      let out = unmaskIcu(translatedMasked[i], row.placeholders);
      for (const ph of row.placeholders) {
        if (!out.includes(ph)) {
          const inner = ph.slice(1, -1);
          const loose = new RegExp(`\\{\\s*${inner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}`, "i");
          if (loose.test(out)) continue;
        }
      }
      setDeep(locJson, row.path, out);
    }

    await fs.writeFile(outPath, `${JSON.stringify(locJson, null, 2)}\n`, "utf8");
    console.log(`  wrote ${outPath}`);
    await sleep(900);
  }

  if (!dryRun && targetLocales.length) console.log("Done. Run: npm run i18n:check");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
