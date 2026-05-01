/**
 * Machine-translate all user-visible strings for the chair agenda voting panel:
 * - sessionControlClient: keys agenda* and untitled
 * - voting (entire subtree — modal VotingPanel)
 * - agendaTopics (committee topic titles for the panel)
 *
 * Preserves `{placeholder}` segments by masking during translation.
 *
 * Usage:
 *   node scripts/translate-agenda-voting-panel.mjs
 *   node scripts/translate-agenda-voting-panel.mjs --locale=ja
 *   node scripts/translate-agenda-voting-panel.mjs --only-untranslated
 *   node scripts/translate-agenda-voting-panel.mjs --locale=km --skip-agenda-topics
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

/** next-intl ICU plural/select — copy English verbatim to avoid breaking. */
function isComplexIcu(value) {
  return /,\s*plural\s*,/.test(value) || /,\s*select\s*,/.test(value);
}

function pickSessionControlAgendaPart(sessionControlClient) {
  if (!sessionControlClient || typeof sessionControlClient !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(sessionControlClient)) {
    if (k.startsWith("agenda") || k === "untitled") {
      out[k] = v;
    }
  }
  return out;
}

function buildWorkList(en, { skipAgendaTopics }) {
  const rows = [];

  const scPick = pickSessionControlAgendaPart(en.sessionControlClient);
  for (const { path, value } of flattenStrings(scPick)) {
    rows.push({ path: `sessionControlClient.${path}`, value });
  }

  if (en.voting && typeof en.voting === "object") {
    for (const { path, value } of flattenStrings(en.voting)) {
      rows.push({ path: `voting.${path}`, value });
    }
  }

  if (!skipAgendaTopics && en.agendaTopics && typeof en.agendaTopics === "object") {
    for (const { path, value } of flattenStrings(en.agendaTopics)) {
      rows.push({ path: `agendaTopics.${path}`, value });
    }
  }

  return rows.filter((r) => typeof r.value === "string" && r.value.length > 0);
}

async function main() {
  const args = process.argv.slice(2);
  const localeArg = args.find((a) => a.startsWith("--locale="));
  const onlyLocale = localeArg ? localeArg.split("=")[1]?.trim() : null;
  const onlyUntranslated = args.includes("--only-untranslated");
  const skipAgendaTopics = args.includes("--skip-agenda-topics");

  const enPath = path.join(messagesDir, "en.json");
  const en = JSON.parse(await fs.readFile(enPath, "utf8"));
  const rows = buildWorkList(en, { skipAgendaTopics });

  const maskedRows = rows.map((r) => ({
    path: r.path,
    ...maskPlaceholders(r.value),
  }));

  let targetLocales = onlyLocale ? [onlyLocale] : Object.keys(GOOGLE_LANG);
  if (onlyUntranslated) {
    const ref = en.voting?.agendaVoteSection;
    const pending = [];
    for (const locale of Object.keys(GOOGLE_LANG)) {
      const p = path.join(messagesDir, `${locale}.json`);
      const data = JSON.parse(await fs.readFile(p, "utf8"));
      if (ref && data.voting?.agendaVoteSection === ref) pending.push(locale);
    }
    targetLocales = pending;
    console.log(`--only-untranslated: ${pending.length} locale(s): ${pending.join(", ") || "(none)"}`);
    if (pending.length === 0) {
      console.log("Done. Run: npm run i18n:check");
      return;
    }
  }

  for (const locale of targetLocales) {
    const googleTo = GOOGLE_LANG[locale];
    if (!googleTo) {
      console.error(`Unknown locale: ${locale}`);
      process.exit(1);
    }

    const outPath = path.join(messagesDir, `${locale}.json`);
    const data = JSON.parse(await fs.readFile(outPath, "utf8"));

    const translatedParts = new Array(rows.length);
    const chunkSize = 8;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunkEnd = Math.min(i + chunkSize, rows.length);
      const batchIn = [];
      const batchMap = [];
      for (let j = i; j < chunkEnd; j++) {
        if (isComplexIcu(rows[j].value)) {
          translatedParts[j] = rows[j].value;
        } else {
          batchMap.push(j);
          batchIn.push(maskedRows[j].masked);
        }
      }
      if (batchIn.length > 0) {
        const part = await translateBatch(batchIn, googleTo);
        for (let k = 0; k < batchMap.length; k++) {
          const j = batchMap[k];
          translatedParts[j] = unmask(part[k], maskedRows[j].placeholders);
        }
      }
      await sleep(500);
    }

    for (let i = 0; i < rows.length; i++) {
      if (translatedParts[i] === undefined) {
        translatedParts[i] = rows[i].value;
      }
      setDeep(data, rows[i].path, translatedParts[i]);
    }

    await fs.writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`${locale}: updated ${rows.length} agenda voting panel strings`);
    await sleep(700);
  }

  console.log("Done. Run: npm run i18n:check");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
