#!/usr/bin/env node
/**
 * Re-process committee logos in Supabase storage: make dark/near-black pixels transparent.
 * Run from repo root: node scripts/knockout-committee-logo-backgrounds.mjs
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Requires: python3 + Pillow (pip install pillow)
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const PYTHON = `import sys
from PIL import Image

THRESHOLD = 52
path_in, path_out = sys.argv[1], sys.argv[2]
img = Image.open(path_in).convert("RGBA")
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if max(r, g, b) <= THRESHOLD:
            pixels[x, y] = (r, g, b, 0)
img.save(path_out, "PNG")
`;

function knockoutWithPython(inputPath, outputPath) {
  const scriptPath = path.join(os.tmpdir(), `intermun-logo-knockout-${process.pid}.py`);
  fs.writeFileSync(scriptPath, PYTHON);
  try {
    execFileSync("python3", [scriptPath, inputPath, outputPath], { stdio: "pipe" });
  } finally {
    fs.unlinkSync(scriptPath);
  }
}

function storagePathFromPublicUrl(publicUrl, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  try {
    execFileSync("python3", ["-c", "import PIL"], { stdio: "pipe" });
  } catch {
    console.error("Install Pillow first: pip install pillow");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const bucket = "committee-logos";

  const { data: rows, error } = await supabase
    .from("conferences")
    .select("committee, committee_logo_url")
    .not("committee_logo_url", "is", null);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const byUrl = new Map();
  for (const row of rows ?? []) {
    const logoUrl = row.committee_logo_url?.trim();
    if (!logoUrl) continue;
    if (!byUrl.has(logoUrl)) {
      byUrl.set(logoUrl, row.committee?.trim() || "committee");
    }
  }

  if (byUrl.size === 0) {
    console.log("No committee_logo_url rows found.");
    return;
  }

  console.log(`Processing ${byUrl.size} unique logo(s)...`);

  for (const [logoUrl, label] of byUrl) {
    const objectPath = storagePathFromPublicUrl(logoUrl, bucket);
    if (!objectPath) {
      console.warn(`Skip ${label}: unrecognized storage URL`);
      continue;
    }

    const res = await fetch(logoUrl);
    if (!res.ok) {
      console.warn(`Skip ${label}: download failed (${res.status})`);
      continue;
    }

    const tmpIn = path.join(os.tmpdir(), `logo-in-${process.pid}.png`);
    const tmpOut = path.join(os.tmpdir(), `logo-out-${process.pid}.png`);
    fs.writeFileSync(tmpIn, Buffer.from(await res.arrayBuffer()));

    try {
      knockoutWithPython(tmpIn, tmpOut);
      const body = fs.readFileSync(tmpOut);
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(objectPath, body, {
        contentType: "image/png",
        upsert: true,
      });
      if (uploadErr) {
        console.warn(`Skip ${label}: upload failed — ${uploadErr.message}`);
        continue;
      }
      console.log(`OK ${label} → ${objectPath}`);
    } catch (e) {
      console.warn(`Skip ${label}: ${e instanceof Error ? e.message : e}`);
    } finally {
      for (const p of [tmpIn, tmpOut]) {
        try {
          fs.unlinkSync(p);
        } catch {
          /* ignore */
        }
      }
    }
  }

  console.log("Done. Hard-refresh the SMT overview if logos are cached in the browser.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
