/**
 * Copy missing keys from messages/en.json into every other locale file.
 * Existing translations are preserved; only absent keys are added (English values).
 *
 * Usage: node scripts/merge-locale-gaps.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const baseLocale = "en";
const locales = [
  "es",
  "fr",
  "de",
  "pt",
  "pt-BR",
  "it",
  "nl",
  "ru",
  "pl",
  "uk",
  "el",
  "tr",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "vi",
  "th",
  "id",
  "hi",
  "bn",
  "ar",
  "fa",
  "he",
  "sw",
  "mi",
  "km",
  "lo",
  "my",
  "ms",
];

function mergeMissing(target, source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return target !== undefined ? target : source;
  }
  const out =
    target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = mergeMissing(out[key], value);
    } else if (!(key in out)) {
      out[key] = value;
    }
  }
  return out;
}

function flatten(obj, prefix = "", out = []) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    out.push(prefix);
    return out;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    out.push(prefix);
    return out;
  }
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key;
    flatten(obj[key], next, out);
  }
  return out;
}

const en = JSON.parse(await fs.readFile(path.join(messagesDir, `${baseLocale}.json`), "utf8"));
const baseKeys = new Set(flatten(en).filter(Boolean));

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const existing = JSON.parse(await fs.readFile(filePath, "utf8"));
  const before = new Set(flatten(existing).filter(Boolean));
  const merged = mergeMissing(existing, en);
  const after = new Set(flatten(merged).filter(Boolean));
  const added = [...after].filter((k) => !before.has(k)).length;
  await fs.writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  const missing = [...baseKeys].filter((k) => !after.has(k)).length;
  console.log(`${locale}: +${added} keys${missing ? ` (${missing} still missing)` : ""}`);
}

console.log("Done. Run: npm run i18n:translate-gaps");
