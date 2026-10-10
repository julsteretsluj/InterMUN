#!/usr/bin/env node
/**
 * Store every person in the SEAMUN I 2027 allocation matrix (dais + delegations) in
 * allocation_roster_contacts (staff-only), linked to the canonical committee seat.
 * Never creates auth users or sends email — pair with sync-matrix-allocations.mjs --no-invite.
 *
 * Usage:
 *   node scripts/import-matrix-roster.mjs "/path/to/matrix.xlsx" [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVENT_ID = "11111111-1111-1111-1111-111111111101";

const SHEET_TO_COMMITTEE = {
  INTERPOL: "Interpol",
  PC: "Press Corps",
  FWC: "FWC - Stranger Things",
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

function parseRoster(xlsxPath) {
  const py = String.raw`
import json, re, sys, openpyxl

def s(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
people, seats = [], []
for sheet in wb.sheetnames:
    if sheet == "MAIN":
        continue
    ws = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    hdr = None
    for i, row in enumerate(rows):
        a = s(row[0]) if row else ""
        if a in ("Delegation", "Country", "Person", "Agency"):
            hdr = i
            break
    for i, row in enumerate(rows[: hdr if hdr is not None else 8]):
        role = s(row[0])
        if not re.search(r"chair|editor", role, re.I):
            continue
        cells = [s(c) for c in row]
        name = cells[1] if len(cells) > 1 else ""
        if not name or name == "Name Surname":
            continue
        school = cells[2] if len(cells) > 2 and cells[2] != "School" else ""
        email = next((c for c in cells[2:] if "@" in c), "")
        grade = next((c for c in cells[3:6] if re.fullmatch(r"\d{1,2}", c)), "")
        placard = ""
        matrix_id = ""
        for c in cells:
            m = re.search(r"SEAMUN-\d{4}-DAIS-\d+", c)
            if m:
                placard = m.group(0)
            m = re.match(r"^ID\s*=\s*(\S+)", c)
            if m:
                matrix_id = m.group(1)
        people.append({"sheet": sheet, "row": i + 1, "kind": "dais", "position": role,
                       "name": name, "school": school, "email": email, "grade": grade,
                       "placard": placard, "matrixId": matrix_id, "status": "", "notes": "", "backup": ""})
    if hdr is None:
        continue
    for i, row in enumerate(rows[hdr + 1 :], start=hdr + 2):
        cells = [s(c) for c in row] + [""] * 10
        delegation = cells[0]
        if not delegation:
            continue
        if delegation.lower().startswith("total"):
            break
        seats.append({"sheet": sheet, "delegation": delegation})
        name, email = cells[5], cells[7]
        if not name and not email:
            continue
        people.append({"sheet": sheet, "row": i, "kind": "delegate", "position": delegation,
                       "name": name, "school": cells[6], "email": email, "grade": cells[4],
                       "placard": cells[2], "matrixId": cells[3], "status": cells[1],
                       "notes": cells[8], "backup": cells[9]})
print(json.dumps({"people": people, "seats": seats}))
`;
  const result = spawnSync("python3", ["-c", py, xlsxPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Failed to parse workbook");
  return JSON.parse(result.stdout);
}

function topicRank(name) {
  const m = (name ?? "").match(/topic\s*(\d+)/i);
  return m ? Number(m[1]) : 999;
}

function daisSeatLabel(position) {
  const p = position.toLowerCase();
  if (p === "editor" || p.includes("head")) return "head chair";
  return "co-chair";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const xlsxPath = args.find((a) => !a.startsWith("--"));
  if (!xlsxPath) {
    console.error("Usage: node scripts/import-matrix-roster.mjs <matrix.xlsx> [--dry-run]");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { people, seats } = parseRoster(xlsxPath);

  const { data: confs, error: cErr } = await admin
    .from("conferences")
    .select("id, committee, name, created_at")
    .eq("event_id", EVENT_ID);
  if (cErr) throw cErr;
  const canonical = new Map();
  for (const c of [...(confs ?? [])].sort(
    (a, b) => topicRank(a.name) - topicRank(b.name) || String(a.created_at).localeCompare(String(b.created_at))
  )) {
    if (c.committee && !canonical.has(c.committee)) canonical.set(c.committee, c.id);
  }
  const { data: allocs, error: aErr } = await admin
    .from("allocations")
    .select("id, conference_id, country")
    .in("conference_id", [...canonical.values()]);
  if (aErr) throw aErr;
  const seatIndex = new Map();
  for (const a of allocs ?? []) {
    const k = `${a.conference_id}|${a.country.trim().toLowerCase()}`;
    if (!seatIndex.has(k)) seatIndex.set(k, a.id);
  }

  const issues = { unknownCommittees: new Set(), unmatchedSeats: [], missingEmail: [], malformedEmail: [], missingName: [] };
  const committeeOf = (sheet) => SHEET_TO_COMMITTEE[sheet] ?? sheet;

  for (const seat of seats) {
    const conf = canonical.get(committeeOf(seat.sheet));
    if (!conf) {
      issues.unknownCommittees.add(seat.sheet);
      continue;
    }
    if (!seatIndex.has(`${conf}|${seat.delegation.toLowerCase()}`)) {
      issues.unmatchedSeats.push(`${seat.sheet}: ${seat.delegation}`);
    }
  }

  const rows = [];
  for (const p of people) {
    const committee = committeeOf(p.sheet);
    const conf = canonical.get(committee);
    if (!conf) issues.unknownCommittees.add(p.sheet);
    const label = p.kind === "dais" ? daisSeatLabel(p.position) : p.position.toLowerCase();
    const allocationId = conf ? seatIndex.get(`${conf}|${label}`) ?? null : null;
    const email = p.email.trim().toLowerCase();
    const who = `${p.sheet} ${p.position}: ${p.name || "(no name)"}`;
    if (!email) issues.missingEmail.push(who);
    else if (!EMAIL_RE.test(email)) issues.malformedEmail.push(`${who} <${p.email}>`);
    if (!p.name) issues.missingName.push(`${p.sheet} ${p.position} <${p.email}>`);
    rows.push({
      event_id: EVENT_ID,
      source_key: `${committee}|${p.kind}|${p.position}`,
      allocation_id: allocationId,
      committee,
      role: p.kind === "dais" ? "chair" : committee === "Press Corps" ? "press" : "delegate",
      position: p.position,
      full_name: p.name || p.email,
      email: email || null,
      grade: p.grade || null,
      school: p.school || null,
      placard_code: p.placard || null,
      matrix_id: p.matrixId || null,
      status: p.status || null,
      notes: p.notes || null,
      backup_allocation: p.backup || null,
      source: `${path.basename(xlsxPath)} › ${p.sheet} row ${p.row}`,
      updated_at: new Date().toISOString(),
    });
  }

  const byEmail = new Map();
  for (const r of rows) {
    if (!r.email) continue;
    byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), `${r.committee} ${r.position}`]);
  }
  const multipleAllocations = [...byEmail].filter(([, v]) => v.length > 1).map(([e, v]) => ({ email: e, seats: v }));
  const unlinked = rows.filter((r) => !r.allocation_id).map((r) => `${r.committee} ${r.position}`);

  if (!dryRun && rows.length) {
    const { error } = await admin
      .from("allocation_roster_contacts")
      .upsert(rows, { onConflict: "event_id,source_key" });
    if (error) throw error;
  }

  const perCommittee = {};
  for (const r of rows) {
    perCommittee[r.committee] ??= { delegate: 0, press: 0, chair: 0 };
    perCommittee[r.committee][r.role] += 1;
  }
  const seatsPerSheet = {};
  for (const s of seats) seatsPerSheet[s.sheet] = (seatsPerSheet[s.sheet] ?? 0) + 1;

  console.log(
    JSON.stringify(
      {
        dryRun,
        people: rows.length,
        perCommittee,
        seatsPerSheet,
        unlinked,
        multipleAllocations,
        issues: { ...issues, unknownCommittees: [...issues.unknownCommittees] },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
