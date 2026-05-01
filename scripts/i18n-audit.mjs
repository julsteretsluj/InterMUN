import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const reportsDir = path.join(root, "reports", "i18n");
const reportJsonPath = path.join(reportsDir, "i18n-audit.json");
const reportMdPath = path.join(reportsDir, "i18n-audit.md");
const baseLocale = "en";
const includedExts = new Set([".ts", ".tsx"]);
const excludedDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  ".cursor",
  "messages",
  "supabase",
  "reports",
]);

function isProbablyHumanText(text) {
  if (!text) return false;
  if (text.length < 2) return false;
  if (/^\d+$/.test(text)) return false;
  if (/^[A-Z0-9_./-]+$/.test(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^\s*(https?:\/\/|\/[A-Za-z0-9])/i.test(text)) return false;
  return true;
}

function flatten(obj, prefix = "", out = {}) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    out[prefix] = String(obj ?? "");
    return out;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    out[prefix] = "";
    return out;
  }
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key;
    flatten(obj[key], next, out);
  }
  return out;
}

function extractPlaceholders(message) {
  const values = [];
  const re = /\{\s*([a-zA-Z0-9_]+)\s*(?:,[^}]*)?\}/g;
  let match;
  while ((match = re.exec(message)) !== null) {
    values.push(match[1]);
  }
  return [...new Set(values)].sort();
}

async function walkFiles(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludedDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!includedExts.has(ext)) continue;
    out.push(fullPath);
  }
  return out;
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function collectHardcodedStrings(filePath, content) {
  const findings = [];
  const lines = content.split("\n");
  const patterns = [
    {
      kind: "jsx_text",
      regex: />\s*([^<{][^<>{]*[A-Za-z][^<>{]*)\s*</g,
    },
    {
      kind: "attribute_literal",
      regex:
        /\b(?:placeholder|title|aria-label|aria-description|alt|label)\s*=\s*["'`]([^"'`]*[A-Za-z][^"'`]*)["'`]/g,
    },
    {
      kind: "error_literal",
      regex: /\b(?:throw new Error|new Error)\(\s*["'`]([^"'`]*[A-Za-z][^"'`]*)["'`]\s*\)/g,
    },
    {
      kind: "object_message_literal",
      regex: /\b(?:error|message|title|description|label|placeholder)\s*:\s*["'`]([^"'`]*[A-Za-z][^"'`]*)["'`]/g,
    },
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        const text = match[1].trim();
        if (!isProbablyHumanText(text)) continue;
        if (text.includes("t(") || text.includes("tp(") || text.includes("useTranslations")) continue;
        findings.push({
          file: relative(filePath),
          line: i + 1,
          kind: pattern.kind,
          text,
        });
      }
    }
  }
  return findings;
}

function classifyDomain(file) {
  if (file.startsWith("app/actions/")) return "server_action";
  if (file.startsWith("app/api/")) return "api";
  if (file.startsWith("components/")) return "component";
  if (file.startsWith("app/")) return "page_or_layout";
  if (file.startsWith("lib/")) return "library_surface";
  return "other";
}

function keyPrefixForFile(file) {
  if (file.startsWith("app/actions/")) {
    const name = path.basename(file).replace(/\.[^.]+$/, "");
    return `serverActions.${name}`;
  }
  if (file.startsWith("components/")) {
    const parts = file.split("/");
    const area = parts[1] ?? "shared";
    return `components.${area}`;
  }
  if (file.startsWith("app/")) {
    return "pageTitles";
  }
  if (file.startsWith("lib/")) {
    return "common";
  }
  return "common";
}

async function readLocaleFiles() {
  const entries = await fs.readdir(messagesDir, { withFileTypes: true });
  const localeFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.replace(/\.json$/, ""))
    .sort((a, b) => a.localeCompare(b));
  return localeFiles;
}

async function run() {
  const localeFiles = await readLocaleFiles();
  if (!localeFiles.includes(baseLocale)) {
    throw new Error(`Base locale "${baseLocale}" is missing in messages/.`);
  }

  const baseRaw = JSON.parse(
    await fs.readFile(path.join(messagesDir, `${baseLocale}.json`), "utf8")
  );
  const base = flatten(baseRaw);
  const baseKeys = Object.keys(base).filter(Boolean);

  const localeParity = [];
  const placeholderMismatches = [];
  for (const locale of localeFiles) {
    if (locale === baseLocale) continue;
    const json = JSON.parse(await fs.readFile(path.join(messagesDir, `${locale}.json`), "utf8"));
    const flat = flatten(json);
    const keys = Object.keys(flat).filter(Boolean);
    const keySet = new Set(keys);
    const missing = baseKeys.filter((key) => !keySet.has(key));
    const extra = keys.filter((key) => !baseKeys.includes(key));

    for (const key of baseKeys) {
      if (!(key in flat)) continue;
      const expected = extractPlaceholders(base[key]);
      const actual = extractPlaceholders(flat[key]);
      if (expected.join("|") !== actual.join("|")) {
        placeholderMismatches.push({
          locale,
          key,
          expected,
          actual,
        });
      }
    }

    localeParity.push({
      locale,
      missingCount: missing.length,
      extraCount: extra.length,
      missingPreview: missing.slice(0, 10),
      extraPreview: extra.slice(0, 10),
    });
  }

  const files = await walkFiles(root);
  const hardcoded = [];
  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    hardcoded.push(...collectHardcodedStrings(filePath, content));
  }

  const inventory = hardcoded.map((item) => ({
    ...item,
    domain: classifyDomain(item.file),
    suggestedKeyPrefix: keyPrefixForFile(item.file),
  }));

  const byDomain = inventory.reduce((acc, item) => {
    acc[item.domain] = (acc[item.domain] ?? 0) + 1;
    return acc;
  }, {});

  const result = {
    generatedAt: new Date().toISOString(),
    summary: {
      localeCount: localeFiles.length,
      hardcodedCount: inventory.length,
      placeholderMismatchCount: placeholderMismatches.length,
      localesWithParityIssues: localeParity.filter(
        (entry) => entry.missingCount > 0 || entry.extraCount > 0
      ).length,
      hardcodedByDomain: byDomain,
    },
    localeParity,
    placeholderMismatches,
    hardcodedInventory: inventory,
  };

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(reportJsonPath, JSON.stringify(result, null, 2));

  const md = [];
  md.push("# i18n Audit Report");
  md.push("");
  md.push(`Generated: ${result.generatedAt}`);
  md.push("");
  md.push("## Summary");
  md.push("");
  md.push(`- Locales: ${result.summary.localeCount}`);
  md.push(`- Hardcoded string findings: ${result.summary.hardcodedCount}`);
  md.push(
    `- Placeholder mismatches: ${result.summary.placeholderMismatchCount}`
  );
  md.push(
    `- Locales with parity issues: ${result.summary.localesWithParityIssues}`
  );
  md.push("");
  md.push("### Hardcoded Findings by Domain");
  md.push("");
  for (const [domain, count] of Object.entries(result.summary.hardcodedByDomain)) {
    md.push(`- ${domain}: ${count}`);
  }
  md.push("");
  md.push("## Locale Parity");
  md.push("");
  for (const entry of localeParity) {
    md.push(
      `- ${entry.locale}: missing=${entry.missingCount}, extra=${entry.extraCount}`
    );
  }
  md.push("");
  md.push("## Placeholder Mismatches (Preview)");
  md.push("");
  if (placeholderMismatches.length === 0) {
    md.push("- None");
  } else {
    for (const mismatch of placeholderMismatches.slice(0, 50)) {
      md.push(
        `- ${mismatch.locale} -> ${mismatch.key} (expected: ${mismatch.expected.join(", ") || "none"}; actual: ${mismatch.actual.join(", ") || "none"})`
      );
    }
  }
  md.push("");
  md.push("## Hardcoded Inventory (Top 200)");
  md.push("");
  for (const item of inventory.slice(0, 200)) {
    md.push(
      `- ${item.file}:${item.line} [${item.kind}] "${item.text}" -> suggested prefix: \`${item.suggestedKeyPrefix}\``
    );
  }
  md.push("");
  md.push(
    `Full machine-readable inventory is available at \`${relative(reportJsonPath)}\`.`
  );
  md.push("");

  await fs.writeFile(reportMdPath, md.join("\n"));

  console.log(`i18n audit complete.`);
  console.log(`- JSON: ${relative(reportJsonPath)}`);
  console.log(`- Markdown: ${relative(reportMdPath)}`);
  console.log(`- Hardcoded findings: ${inventory.length}`);
  console.log(`- Placeholder mismatches: ${placeholderMismatches.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
