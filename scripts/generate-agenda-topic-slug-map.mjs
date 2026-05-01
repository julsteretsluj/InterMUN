/**
 * Builds lib/i18n/generated/agenda-topic-slug-to-key.json from messages/en.json agendaTopics.
 * Run after editing English topic strings: npm run i18n:generate-agenda-slugs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enPath = path.join(root, "messages", "en.json");
const outPath = path.join(root, "lib", "i18n", "generated", "agenda-topic-slug-to-key.json");

function slugifyLabel(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const agenda = en.agendaTopics;
if (!agenda || typeof agenda !== "object") {
  console.error("en.json missing agendaTopics");
  process.exit(1);
}

const map = {};
const collisions = [];

for (const [key, value] of Object.entries(agenda)) {
  if (key === "topicQuestionOf") continue;
  if (typeof value !== "string") continue;
  if (/\{[^}]+\}/.test(value)) continue;
  const slug = slugifyLabel(value);
  if (!slug) continue;
  if (map[slug] && map[slug] !== key) {
    collisions.push({ slug, was: map[slug], now: key });
  }
  map[slug] = key;
}

if (collisions.length) {
  console.warn("Slug collisions (later key wins):", collisions);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
console.log(`Wrote ${Object.keys(map).length} slugs → ${outPath}`);
