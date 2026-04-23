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
];

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

const base = JSON.parse(await fs.readFile(path.join(messagesDir, `${baseLocale}.json`), "utf8"));
const baseKeys = new Set(flatten(base).filter(Boolean));
let ok = true;

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const json = JSON.parse(await fs.readFile(filePath, "utf8"));
  const keys = new Set(flatten(json).filter(Boolean));
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));
  if (missing.length || extra.length) {
    ok = false;
    console.error(`Locale parity failed for ${locale}`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  Extra: ${extra.join(", ")}`);
  }
}

if (!ok) process.exit(1);
console.log("Locale parity check passed.");
