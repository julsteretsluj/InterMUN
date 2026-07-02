#!/usr/bin/env node
/**
 * Replace committee emblems in Supabase storage + `conferences.committee_logo_url`.
 *
 * Source PNGs live in `scripts/committee-logo-source/` and are keyed to the exact
 * DB `committee` label. Each image is edge-flood knocked out (black matte → alpha)
 * with Pillow before upload, matching the in-app upload pipeline.
 *
 * Dry run (default): node scripts/replace-committee-logos.mjs
 * Apply:             node scripts/replace-committee-logos.mjs --apply
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
const SOURCE_DIR = path.join(__dirname, "committee-logo-source");
const BUCKET = "committee-logos";
const APPLY = process.argv.includes("--apply");

/** DB `committee` label → local source PNG. Labels must match exactly. */
const COMMITTEE_SOURCE = {
  "UNHRC": "unhrc.png",
  "DISEC": "disec.png",
  "Press Corps": "press-corps.png",
  "WHO": "who.png",
  "UN Women": "un-women.png",
  "UNSC": "unsc.png",
  "ECOSOC": "ecosoc.png",
  "UNODC": "unodc.png",
  "Interpol": "interpol.png",
  "FWC - Stranger Things": "fwc.png",
};

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
from collections import deque
from PIL import Image

EDGE_BG_MAX = 34

def is_bg(r, g, b, a):
    if a < 10:
        return True
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx <= EDGE_BG_MAX:
        return True
    if mx <= 48 and mx - mn <= 6:
        return True
    return False

def flood_knockout(img):
    w, h = img.size
    pixels = img.load()
    visited = set()
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, a = pixels[x, y]
        if not is_bg(r, g, b, a):
            continue
        pixels[x, y] = (r, g, b, 0)
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))

path_in, path_out = sys.argv[1], sys.argv[2]
img = Image.open(path_in).convert("RGBA")
flood_knockout(img)
img.save(path_out, "PNG")
`;

function knockoutWithPython(inputPath, outputPath) {
  const scriptPath = path.join(os.tmpdir(), `intermun-logo-replace-${process.pid}.py`);
  fs.writeFileSync(scriptPath, PYTHON);
  try {
    execFileSync("python3", [scriptPath, inputPath, outputPath], { stdio: "pipe" });
  } finally {
    fs.unlinkSync(scriptPath);
  }
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

  for (const file of Object.values(COMMITTEE_SOURCE)) {
    const p = path.join(SOURCE_DIR, file);
    if (!fs.existsSync(p)) {
      console.error(`Missing source image: ${p}`);
      process.exit(1);
    }
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const labels = Object.keys(COMMITTEE_SOURCE);
  const { data: rows, error } = await supabase
    .from("conferences")
    .select("id, event_id, committee, committee_code, committee_logo_url")
    .in("committee", labels);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No matching conference rows found.");
    return;
  }

  // Group rows by committee label → uploads once per (event_id, committee_code).
  const byKey = new Map();
  for (const r of rows) {
    const label = r.committee?.trim();
    if (!label || !COMMITTEE_SOURCE[label]) continue;
    const code = (r.committee_code ?? "").trim();
    if (!code) {
      console.warn(`Skip "${label}" (conference ${r.id}): no committee_code`);
      continue;
    }
    const k = `${r.event_id}::${code}`;
    if (!byKey.has(k)) {
      byKey.set(k, { event_id: r.event_id, code, label, rowIds: [] });
    }
    byKey.get(k).rowIds.push(r.id);
  }

  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${byKey.size} committee target(s), ${rows.length} conference row(s)\n`);

  for (const { event_id, code, label, rowIds } of byKey.values()) {
    const sourceFile = COMMITTEE_SOURCE[label];
    const objectPath = `committees/${event_id}/${code}/${Date.now()}.png`;
    console.log(`• ${label}  [event=${event_id} code=${code}]  ← ${sourceFile}  (${rowIds.length} row(s))`);

    if (!APPLY) continue;

    const srcPath = path.join(SOURCE_DIR, sourceFile);
    const tmpOut = path.join(os.tmpdir(), `logo-out-${process.pid}-${code}.png`);
    try {
      knockoutWithPython(srcPath, tmpOut);
      const body = fs.readFileSync(tmpOut);

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "60",
      });
      if (uploadErr) {
        console.warn(`  ! upload failed: ${uploadErr.message}`);
        continue;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) {
        console.warn(`  ! no public URL`);
        continue;
      }

      const { error: updErr, count } = await supabase
        .from("conferences")
        .update({ committee_logo_url: publicUrl }, { count: "exact" })
        .eq("event_id", event_id)
        .eq("committee_code", code);
      if (updErr) {
        console.warn(`  ! db update failed: ${updErr.message}`);
        continue;
      }
      console.log(`  ✓ ${count ?? "?"} row(s) → ${publicUrl}`);
    } catch (e) {
      console.warn(`  ! ${e instanceof Error ? e.message : e}`);
    } finally {
      try {
        fs.unlinkSync(tmpOut);
      } catch {
        /* ignore */
      }
    }
  }

  console.log(`\nDone.${APPLY ? " Hard-refresh (Cmd+Shift+R) to bypass cached images." : " Re-run with --apply to write."}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
