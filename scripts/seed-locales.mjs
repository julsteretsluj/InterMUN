import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const sourceLocale = "en";
const locales = [
  "en",
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

await fs.mkdir(messagesDir, { recursive: true });
const sourcePath = path.join(messagesDir, `${sourceLocale}.json`);
const sourceText = await fs.readFile(sourcePath, "utf8");
const sourceJson = JSON.parse(sourceText);
const pretty = `${JSON.stringify(sourceJson, null, 2)}\n`;

for (const locale of locales) {
  const localePath = path.join(messagesDir, `${locale}.json`);
  await fs.writeFile(localePath, pretty, "utf8");
}

console.log(`Seeded ${locales.length} locale files from ${sourceLocale}.json`);
