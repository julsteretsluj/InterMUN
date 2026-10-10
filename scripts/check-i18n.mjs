// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Validates every messages/*.json catalog against messages/en.json:
 *  - strict JSON (incl. duplicate keys, which JSON.parse silently collapses)
 *  - ICU syntax (parses + formats every message with intl-messageformat)
 *  - shape conflicts (string in en, object in a locale, or vice versa)
 *  - key parity (missing / extra keys vs en)
 *  - placeholder + rich-text tag parity vs en (a translation that drops or
 *    invents `{name}` / `<terms>` breaks t() / t.rich at runtime)
 *  - every locale in lib/i18n/locales.ts has a catalog
 *
 * Usage: node scripts/check-i18n.mjs [--warn-missing] [--quiet]
 *   --warn-missing  report missing keys as warnings (runtime falls back to en)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { IntlMessageFormat } from "intl-messageformat";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const BASE = "en";
const args = new Set(process.argv.slice(2));
const warnMissing = args.has("--warn-missing");
const quiet = args.has("--quiet");

const errors = [];
const warnings = [];
const err = (locale, msg) => errors.push(`[${locale}] ${msg}`);
const warn = (locale, msg) => warnings.push(`[${locale}] ${msg}`);

/** Minimal JSON scanner that reports duplicate object keys with their path. */
function findDuplicateKeys(text) {
  const dups = [];
  let i = 0;
  const ws = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const str = () => {
    let out = "";
    i++;
    while (text[i] !== '"') {
      if (text[i] === "\\") {
        out += text.slice(i, i + 2);
        i += 2;
      } else out += text[i++];
    }
    i++;
    return JSON.parse(`"${out}"`);
  };
  const value = (p) => {
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const seen = new Set();
      ws();
      if (text[i] === "}") return void i++;
      for (;;) {
        ws();
        const key = str();
        const keyPath = p ? `${p}.${key}` : key;
        if (seen.has(key)) dups.push(keyPath);
        seen.add(key);
        ws();
        i++; // :
        value(keyPath);
        ws();
        if (text[i++] === "}") return;
      }
    } else if (c === "[") {
      i++;
      ws();
      if (text[i] === "]") return void i++;
      let idx = 0;
      for (;;) {
        value(`${p}[${idx++}]`);
        ws();
        if (text[i++] === "]") return;
      }
    } else if (c === '"') str();
    else while (i < text.length && !/[\s,}\]]/.test(text[i])) i++;
  };
  value("");
  return dups;
}

function flatten(obj, prefix = "", out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.set(key, "object");
      flatten(v, key, out);
    } else out.set(key, v);
  }
  return out;
}

/** Collect argument names and rich-text tag names used in an ICU AST. */
function collectTokens(ast, args = new Set(), tags = new Set()) {
  for (const el of ast) {
    if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) {
      args.add(el.value);
    } else if (el.type === TYPE.plural || el.type === TYPE.select) {
      args.add(el.value);
      for (const opt of Object.values(el.options)) collectTokens(opt.value, args, tags);
    } else if (el.type === TYPE.tag) {
      tags.add(el.value);
      collectTokens(el.children, args, tags);
    }
  }
  return { args, tags };
}

function sampleValues(tokens) {
  const values = {};
  for (const a of tokens.args) values[a] = 1;
  for (const t of tokens.tags) values[t] = (chunks) => chunks.join("");
  return values;
}

function analyze(locale, key, message) {
  if (/'[{<]/.test(message)) {
    err(locale, `apostrophe before "{" or "<" at ${key} is an ICU escape and hides the placeholder/tag (use ’ instead)`);
  }
  let ast;
  try {
    ast = parse(message);
  } catch (e) {
    err(locale, `ICU syntax error at ${key}: ${e.message}`);
    return null;
  }
  const tokens = collectTokens(ast);
  try {
    new IntlMessageFormat(message, locale).format(sampleValues(tokens));
  } catch (e) {
    err(locale, `ICU format error at ${key}: ${e.message}`);
  }
  return tokens;
}

const files = (await fs.readdir(messagesDir)).filter((f) => f.endsWith(".json")).sort();
const catalogs = new Map();

for (const file of files) {
  const locale = file.replace(/\.json$/, "");
  const text = await fs.readFile(path.join(messagesDir, file), "utf8");
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    err(locale, `invalid JSON: ${e.message}`);
    continue;
  }
  for (const dup of findDuplicateKeys(text)) err(locale, `duplicate key: ${dup}`);
  catalogs.set(locale, flatten(json));
}

const localesSrc = await fs.readFile(path.join(root, "lib/i18n/locales.ts"), "utf8");
const supported = [
  ...(localesSrc.match(/SUPPORTED_LOCALES = \[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g),
].map((m) => m[1]);
for (const locale of supported) {
  if (!catalogs.has(locale) && !errors.some((e) => e.startsWith(`[${locale}]`))) {
    err(locale, "listed in SUPPORTED_LOCALES but messages file is missing");
  }
}

const base = catalogs.get(BASE);
if (!base) {
  console.error("messages/en.json missing or invalid");
  process.exit(1);
}

const baseTokens = new Map();
for (const [key, value] of base) {
  if (typeof value === "string") baseTokens.set(key, analyze(BASE, key, value));
  else if (value !== "object") err(BASE, `non-string leaf at ${key} (${JSON.stringify(value)})`);
}

const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

for (const [locale, flat] of catalogs) {
  if (locale === BASE) continue;
  const missing = [];
  for (const [key, baseValue] of base) {
    if (!flat.has(key)) {
      if (baseValue !== "object") missing.push(key);
      continue;
    }
    const value = flat.get(key);
    if ((baseValue === "object") !== (value === "object")) {
      err(locale, `shape conflict at ${key}: en has ${baseValue === "object" ? "object" : "string"}, locale has ${value === "object" ? "object" : typeof value}`);
      continue;
    }
    if (value === "object") continue;
    if (typeof value !== "string") {
      err(locale, `non-string leaf at ${key}`);
      continue;
    }
    const tokens = analyze(locale, key, value);
    const ref = baseTokens.get(key);
    if (!tokens || !ref) continue;
    const extraArgs = [...tokens.args].filter((a) => !ref.args.has(a));
    if (extraArgs.length) err(locale, `unknown placeholder(s) ${extraArgs.map((a) => `{${a}}`).join(", ")} at ${key}`);
    if (!sameSet(tokens.tags, ref.tags)) {
      err(locale, `rich-text tags differ at ${key}: en <${[...ref.tags].join(">, <")}>, locale <${[...tokens.tags].join(">, <")}>`);
    }
    const droppedArgs = [...ref.args].filter((a) => !tokens.args.has(a));
    if (droppedArgs.length) err(locale, `placeholder(s) ${droppedArgs.map((a) => `{${a}}`).join(", ")} dropped at ${key}`);
  }
  const extraLeaves = [...flat.keys()].filter((k) => !base.has(k) && flat.get(k) !== "object");
  if (missing.length) {
    const msg = `${missing.length} key(s) missing vs en: ${missing.join(", ")}`;
    (warnMissing ? warn : err)(locale, msg);
  }
  if (extraLeaves.length) err(locale, `${extraLeaves.length} key(s) not in en (misplaced or stale): ${extraLeaves.join(", ")}`);
}

if (!quiet && warnings.length) {
  console.warn(`i18n warnings (${warnings.length}):`);
  for (const w of warnings) console.warn(`  ${w}`);
}
if (errors.length) {
  console.error(`i18n check failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`i18n check passed: ${catalogs.size} locales, ${[...base.values()].filter((v) => v !== "object").length} messages each.`);
