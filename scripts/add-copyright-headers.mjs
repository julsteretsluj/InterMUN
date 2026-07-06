/**
 * One-time / idempotent: prepend Apache copyright header to core source files.
 * Usage: node scripts/add-copyright-headers.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const HEADER = `// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

`;

const MARKER = "Copyright (c) 2026 Intermun";

const roots = [
  "lib",
  "app/actions",
  "types",
  "components",
];

const extraFiles = ["proxy.ts"];

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = [];
for (const r of roots) {
  files.push(...(await walk(path.join(root, r))));
}
for (const f of extraFiles) {
  files.push(path.join(root, f));
}

let updated = 0;
for (const file of files.sort()) {
  const rel = path.relative(root, file);
  let text = await fs.readFile(file, "utf8");
  if (text.includes(MARKER)) continue;
  if (text.startsWith("#!")) {
    const nl = text.indexOf("\n");
    text = text.slice(0, nl + 1) + HEADER + text.slice(nl + 1);
  } else {
    text = HEADER + text;
  }
  await fs.writeFile(file, text);
  updated++;
  console.log(`+ ${rel}`);
}
console.log(`Done. Updated ${updated} file(s).`);
