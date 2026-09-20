#!/usr/bin/env node
/**
 * Sync SEAMUN I 2027 allocations from the official matrix workbook:
 * - Unassign seats for removed registrants
 * - Provision / assign delegates with emails (via provision-delegates-from-matrix)
 * - Apply chair name/school overrides; invite+assign chairs when email is present
 *
 * Usage:
 *   node scripts/sync-matrix-allocations.mjs "/path/to/matrix.xlsx" [--dry-run] [--no-invite]
 *
 * --no-invite  Update overrides + assign existing accounts only (no auth invites / createUser).
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inviteUserByEmailWithArchive } from "./lib/invite-with-archive.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVENT_ID = "11111111-1111-1111-1111-111111111101";

/** People cleared from matrix (11) vs (10) — unassign if still linked. */
const REMOVALS = [
  { email: "taliuihelotuhifo@gmail.com", name: "Lotu Hifo" },
  { email: "peterretter4@outlook.com", name: "Peter Retter" },
  { email: "laumatianashawn0@gmail.com", name: "Nashawn Laumatia" },
  { email: "michaelfaaui@gmail.com", name: "Michael Fa'aui" },
  { email: "equatorjrfalaniko.s@my.delasalle.school.nz", name: "Equator Sausoo" },
];

const SHEET_TO_COMMITTEE = {
  ECOSOC: "ECOSOC",
  "Press Corps": "Press Corps",
  UNHRC: "UNHRC",
  UNODC: "UNODC",
  UNSC: "UNSC",
  "UN Women": "UN Women",
  DISEC: "DISEC",
  "FWC - Stranger Things": "FWC - Stranger Things",
  INTERPOL: "Interpol",
  WHO: "WHO",
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

function parseChairs(xlsxPath) {
  const py = `
import json, openpyxl, re, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
out = []
for name in wb.sheetnames:
    if name == "MAIN":
        continue
    ws = wb[name]
    for row in ws.iter_rows(min_row=1, max_row=6, values_only=True):
        role = row[0]
        if not role:
            continue
        role_s = str(role)
        if "Chair" not in role_s and "Editor" not in role_s:
            continue
        cells = list(row)
        person = (cells[1] or "").strip() if cells[1] else ""
        school = (cells[2] or "").strip() if cells[2] else ""
        email = (cells[3] or "").strip() if cells[3] else ""
        if not person or person in ("Name Surname",):
            continue
        if email.lower() in ("email", "school", ""):
            email = ""
        if school.lower() in ("school",):
            school = ""
        # Some sheets put Placard before Grade and shift email.
        if email and "@" not in email:
            for c in cells[3:]:
                if c and "@" in str(c):
                    email = str(c).strip()
                    break
            else:
                email = ""
        placard = None
        for c in cells:
            if c and "Placard Code" in str(c):
                m = re.search(r"SEAMUN-\\d{4}-DAIS-\\d+", str(c))
                if m:
                    placard = m.group(0)
        out.append({
            "sheet": name,
            "role": role_s.strip(),
            "name": person,
            "school": school,
            "email": email.lower() if email else "",
            "placard": placard,
        })
print(json.dumps(out))
`;
  const result = spawnSync("python3", ["-c", py, xlsxPath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to parse chairs");
  }
  return JSON.parse(result.stdout);
}

async function findUserByEmail(admin, target) {
  const t = target.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === t);
    if (hit) return hit;
    if (data.users.length < 1000) break;
  }
  return null;
}

function topicRank(name) {
  const m = (name ?? "").match(/topic\s*(\d+)/i);
  return m ? Number(m[1]) : 999;
}

async function conferencesByCommittee(admin) {
  const { data, error } = await admin
    .from("conferences")
    .select("id, committee, name, created_at")
    .eq("event_id", EVENT_ID);
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) {
    if (!row.committee) continue;
    const list = map.get(row.committee) ?? [];
    list.push(row);
    map.set(row.committee, list);
  }
  for (const [k, list] of map) {
    list.sort((a, b) => {
      const ta = topicRank(a.name);
      const tb = topicRank(b.name);
      if (ta !== tb) return ta - tb;
      return String(a.created_at).localeCompare(String(b.created_at));
    });
    map.set(k, list);
  }
  return map;
}

function normalizeDaisRole(role) {
  const r = role.toLowerCase().replace(/\s+/g, " ").trim();
  // Press Corps: Editor ≈ Head Chair, Co-Editor ≈ Co-chair (DB seat labels).
  if (r === "editor" || r.includes("head")) return "Head Chair";
  if (r.includes("co")) return "Co-chair";
  return role;
}

async function unassignRemovals(admin, dryRun) {
  const results = [];
  for (const rem of REMOVALS) {
    const user = await findUserByEmail(admin, rem.email);
    if (!user) {
      results.push({ email: rem.email, ok: true, action: "no account — nothing to clear" });
      continue;
    }
    const { data: allocs, error } = await admin
      .from("allocations")
      .select("id, country, conference_id")
      .eq("user_id", user.id);
    if (error) throw error;
    if (dryRun) {
      results.push({
        email: rem.email,
        ok: true,
        dryRun: true,
        action: `would unassign ${allocs?.length ?? 0} seat(s)`,
        seats: allocs,
      });
      continue;
    }
    if (allocs?.length) {
      const ids = allocs.map((a) => a.id);
      const { error: clearErr } = await admin
        .from("allocations")
        .update({ user_id: null })
        .in("id", ids);
      if (clearErr) {
        results.push({ email: rem.email, ok: false, error: clearErr.message });
        continue;
      }
    }
    await admin
      .from("profiles")
      .update({ allocation: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    results.push({
      email: rem.email,
      ok: true,
      action: `unassigned ${allocs?.length ?? 0} seat(s)`,
      seats: allocs,
    });
  }
  return results;
}

async function syncChairs(admin, chairs, origin, dryRun, noInvite) {
  const byCommittee = await conferencesByCommittee(admin);
  const results = [];

  for (const chair of chairs) {
    const committee = SHEET_TO_COMMITTEE[chair.sheet] ?? chair.sheet;
    const confs = byCommittee.get(committee) ?? [];
    if (!confs.length) {
      results.push({ ...chair, ok: false, error: `No conference for ${committee}` });
      continue;
    }
    const seatLabel = normalizeDaisRole(chair.role);
    const seatVariants =
      seatLabel === "Head Chair" ? ["Head Chair"] : ["Co-chair", "Co-Chair"];

    // Resolve seat on canonical conference first (for invite/assign).
    const canonical = confs[0];
    const { data: canonicalSeats } = await admin
      .from("allocations")
      .select("id, country, user_id, display_name_override, display_school_override")
      .eq("conference_id", canonical.id);
    const match = (canonicalSeats ?? []).find((s) =>
      seatVariants.some((v) => s.country.toLowerCase() === v.toLowerCase())
    );
    if (!match) {
      results.push({
        committee,
        role: seatLabel,
        name: chair.name,
        ok: false,
        error: `No ${seatLabel} seat on ${committee}`,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        committee,
        role: seatLabel,
        name: chair.name,
        email: chair.email || null,
        ok: true,
        dryRun: true,
        action:
          "would set name/school override on all topics" +
          (chair.email
            ? noInvite
              ? " + assign if account exists (no invite)"
              : " + invite/assign"
            : " (no email)"),
        allocationId: match.id,
      });
      continue;
    }

    // Update overrides on all topic siblings for this committee
    for (const conf of confs) {
      const { data: seats } = await admin
        .from("allocations")
        .select("id, country")
        .eq("conference_id", conf.id);

      const sibling = (seats ?? []).find((s) =>
        seatVariants.some((v) => s.country.toLowerCase() === v.toLowerCase())
      );
      if (!sibling) continue;

      const { error: ovErr } = await admin
        .from("allocations")
        .update({
          display_name_override: chair.name,
          display_school_override: chair.school || null,
        })
        .eq("id", sibling.id);
      if (ovErr) {
        results.push({ committee, role: seatLabel, ok: false, error: ovErr.message });
        continue;
      }
    }

    {
      // Invite/assign against the canonical topic conference only

      if (!chair.email) {
        results.push({
          committee,
          role: seatLabel,
          name: chair.name,
          ok: true,
          action: "name/school override set — no email in matrix",
          allocationId: match.id,
        });
        continue;
      }

      let user = await findUserByEmail(admin, chair.email);

      // If this chair is currently on another dais seat in the committee, free those seats.
      if (user?.id) {
        for (const conf of confs) {
          const { data: occupied } = await admin
            .from("allocations")
            .select("id, country")
            .eq("conference_id", conf.id)
            .eq("user_id", user.id);
          for (const seat of occupied ?? []) {
            if (seat.id === match.id) continue;
            const isDais = /chair|editor/i.test(seat.country);
            if (!isDais) continue;
            await admin
              .from("allocations")
              .update({
                user_id: null,
                display_name_override: null,
                display_school_override: null,
              })
              .eq("id", seat.id);
          }
        }
      }

      if (match.user_id) {
        if (user?.id === match.user_id) {
          await admin
            .from("profiles")
            .update({
              role: "chair",
              name: chair.name,
              allocation: match.country,
              updated_at: new Date().toISOString(),
            })
            .eq("id", match.user_id);
          results.push({
            committee,
            role: seatLabel,
            email: chair.email,
            ok: true,
            action: "already assigned — profile refreshed",
          });
          continue;
        }
        results.push({
          committee,
          role: seatLabel,
          email: chair.email,
          ok: false,
          error: `Seat already assigned to another user (${match.user_id})`,
        });
        continue;
      }

      let action;
      if (!user) {
        if (noInvite) {
          results.push({
            committee,
            role: seatLabel,
            email: chair.email,
            name: chair.name,
            ok: true,
            action: "name/school override set — no account yet (invite skipped)",
            allocationId: match.id,
          });
          continue;
        }
        if (!origin) {
          results.push({
            committee,
            role: seatLabel,
            email: chair.email,
            ok: false,
            error: "NEXT_PUBLIC_APP_URL required to invite chair",
          });
          continue;
        }
        const { user: invited, error } = await inviteUserByEmailWithArchive(admin, {
          email: chair.email,
          redirectTo: `${origin}/login`,
          data: { full_name: chair.name },
        });
        if (error) {
          const msg = error.message?.toLowerCase() ?? "";
          // Account may already exist from a prior invite attempt — continue to assign.
          user = invited ?? (await findUserByEmail(admin, chair.email));
          if (!user) {
            results.push({
              committee,
              role: seatLabel,
              email: chair.email,
              ok: false,
              error: `Invite failed: ${error.message}`,
            });
            continue;
          }
          action =
            msg.includes("could not be sent") || msg.includes("not configured")
              ? "account ready (invite email failed) + assigned"
              : "assigned after invite warning";
        } else {
          user = invited;
          action = "invite sent + assigned";
        }
      } else {
        action = "assigned existing account as chair";
      }

      if (!user?.id) {
        results.push({
          committee,
          role: seatLabel,
          email: chair.email,
          ok: false,
          error: "Could not resolve chair user id",
        });
        continue;
      }

      await admin
        .from("profiles")
        .update({
          role: "chair",
          name: chair.name,
          allocation: match.country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      const { error: assignErr } = await admin
        .from("allocations")
        .update({ user_id: user.id })
        .eq("id", match.id)
        .is("user_id", null);
      if (assignErr) {
        results.push({
          committee,
          role: seatLabel,
          email: chair.email,
          ok: false,
          error: assignErr.message,
        });
        continue;
      }

      results.push({
        committee,
        role: seatLabel,
        email: chair.email,
        name: chair.name,
        ok: true,
        action: action ?? "assigned",
        allocationId: match.id,
      });
    }
  }

  return results;
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const noInvite = args.includes("--no-invite");
  const xlsxPath = args.find((a) => !a.startsWith("--"));
  if (!xlsxPath) {
    console.error(
      "Usage: node scripts/sync-matrix-allocations.mjs <matrix.xlsx> [--dry-run] [--no-invite]"
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    ""
  );
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const chairs = parseChairs(xlsxPath);
  console.error(`Parsed ${chairs.length} filled chair row(s) from matrix`);

  const removals = await unassignRemovals(admin, dryRun);

  const provisionArgs = [path.join(__dirname, "provision-delegates-from-matrix.mjs"), xlsxPath];
  if (dryRun) provisionArgs.push("--dry-run");
  if (noInvite) provisionArgs.push("--no-invite");
  if (!dryRun) provisionArgs.push("--delay-ms=800");

  const prov = spawnSync("node", provisionArgs, { encoding: "utf8", cwd: ROOT });
  const raw = prov.stdout || "";
  const i = raw.indexOf("{");
  const provision =
    i >= 0 ? JSON.parse(raw.slice(i)) : { error: prov.stderr || "provision failed", status: prov.status };

  const chairResults = await syncChairs(admin, chairs, origin, dryRun, noInvite);

  const summary = {
    dryRun,
    noInvite,
    removals: {
      total: removals.length,
      ok: removals.filter((r) => r.ok).length,
      failed: removals.filter((r) => !r.ok).length,
      results: removals,
    },
    delegates: provision,
    chairs: {
      total: chairResults.length,
      ok: chairResults.filter((r) => r.ok).length,
      failed: chairResults.filter((r) => !r.ok).length,
      missingEmail: chairs.filter((c) => !c.email).map((c) => `${c.sheet} ${c.role}: ${c.name}`),
      results: chairResults,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (
    summary.removals.failed ||
    summary.chairs.failed ||
    (provision?.failed ?? 0) > 0 ||
    provision?.error
  ) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
