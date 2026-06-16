#!/usr/bin/env node
/**
 * Invite delegate accounts and assign allocations from the SEAMUN matrix (v3 layout).
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL
 *
 * Usage:
 *   node scripts/provision-delegates-from-matrix.mjs "/path/to/matrix.xlsx"
 *   node scripts/provision-delegates-from-matrix.mjs "/path/to/matrix.xlsx" --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SPREADSHEET_PREFIX_TO_DB = {
  ECO: "ECO",
  PC: "PRE",
  HRC: "UNH",
  UNS: "UNS",
  UNW: "UNW",
  DIS: "DIS",
  WHO: "WHO",
  ODC: "ODC",
  INT: "INT",
  FWC: "FWC",
};

const SHEET_COMMITTEE_KEY = {
  PC: "Press Corps",
  FWC: "FWC - Stranger Things",
  INTERPOL: "Interpol",
};

function committeeFromSheet(sheet) {
  return SHEET_COMMITTEE_KEY[sheet] ?? sheet;
}

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

function toLegacyGateCode(code) {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^SEAMUN-2027-([A-Z]+)-(\d+)$/i);
  if (!m) return trimmed;
  const prefix = SPREADSHEET_PREFIX_TO_DB[m[1].toUpperCase()] ?? m[1].toUpperCase();
  return `${prefix}-${m[2]}`;
}

function parseDelegates(xlsxPath) {
  const py = path.join(__dirname, "parse-delegate-registrations.py");
  const result = spawnSync("python3", [py, xlsxPath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to parse spreadsheet");
  }
  return JSON.parse(result.stdout);
}

async function createDelegateUser(admin, origin, email, name) {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/login`,
  });
  if (!error) {
    let userId = data?.user?.id ?? null;
    if (!userId) userId = (await findUserByEmail(admin, email))?.id ?? null;
    return { userId, action: "invite email sent" };
  }

  const rateLimited = /rate limit/i.test(error.message);
  if (!rateLimited) {
    return { userId: null, action: null, error: `Invite failed: ${error.message}` };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createErr) {
    return { userId: null, action: null, error: `Create user failed: ${createErr.message}` };
  }
  return {
    userId: created.user?.id ?? null,
    action: "account created (invite rate limit — use Forgot password at /login)",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function getCommitteeScope(admin, conferenceId) {
  const { data: conf, error } = await admin
    .from("conferences")
    .select("id, event_id, committee, name, created_at")
    .eq("id", conferenceId)
    .maybeSingle();
  if (error) throw error;
  if (!conf?.event_id || !conf.committee) {
    return { canonicalConferenceId: conferenceId, siblingConferenceIds: [conferenceId] };
  }

  const { data: siblings, error: sErr } = await admin
    .from("conferences")
    .select("id, name, created_at")
    .eq("event_id", conf.event_id)
    .eq("committee", conf.committee);
  if (sErr) throw sErr;
  const ids = (siblings ?? []).map((r) => r.id);
  if (ids.length <= 1) {
    return { canonicalConferenceId: conferenceId, siblingConferenceIds: ids.length ? ids : [conferenceId] };
  }

  const topicRank = (name) => {
    const m = (name ?? "").match(/topic\s*(\d+)/i);
    return m ? Number(m[1]) : 999;
  };
  const sorted = [...(siblings ?? [])].sort((a, b) => {
    const ta = topicRank(a.name);
    const tb = topicRank(b.name);
    if (ta !== tb) return ta - tb;
    return String(a.created_at).localeCompare(String(b.created_at));
  });
  return {
    canonicalConferenceId: sorted[0]?.id ?? conferenceId,
    siblingConferenceIds: ids,
  };
}

async function findCanonicalConferenceForCommittee(admin, committee) {
  const { data: rows, error } = await admin
    .from("conferences")
    .select("id, committee, name, created_at, event_id")
    .eq("committee", committee)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows?.length) return null;

  const topicRank = (name) => {
    const m = (name ?? "").match(/topic\s*(\d+)/i);
    return m ? Number(m[1]) : 999;
  };
  const sorted = [...rows].sort((a, b) => {
    const ta = topicRank(a.name);
    const tb = topicRank(b.name);
    if (ta !== tb) return ta - tb;
    return String(a.created_at).localeCompare(String(b.created_at));
  });
  const canonicalConferenceId = sorted[0].id;
  const scope = await getCommitteeScope(admin, canonicalConferenceId);
  return scope;
}

async function resolveAllocation(admin, delegate, legacyCode) {
  const committee = committeeFromSheet(delegate.sheet);
  const scope = await findCanonicalConferenceForCommittee(admin, committee);
  if (!scope) return null;

  const { data: byCountry, error: countryErr } = await admin
    .from("allocations")
    .select("id, country, conference_id, user_id")
    .eq("conference_id", scope.canonicalConferenceId)
    .eq("country", delegate.delegation)
    .maybeSingle();
  if (countryErr) throw countryErr;
  if (byCountry) {
    return { allocation: byCountry, scope, legacyCode, matchedBy: "country" };
  }

  if (!legacyCode) return null;

  const { data: gateRows, error: gErr } = await admin
    .from("allocation_gate_codes")
    .select("allocation_id, code, allocations(id, country, conference_id, user_id)")
    .eq("code", legacyCode);
  if (gErr) throw gErr;
  if (!gateRows?.length) return null;

  const candidates = gateRows.map((g) => g.allocations).filter(Boolean);
  if (!candidates.length) return null;

  const onCanonical = candidates.find((a) => a.conference_id === scope.canonicalConferenceId);
  if (onCanonical) return { allocation: onCanonical, scope, legacyCode, matchedBy: "gateCode" };

  const country = candidates[0].country;
  const { data: canonicalAlloc, error: aErr } = await admin
    .from("allocations")
    .select("id, country, conference_id, user_id")
    .eq("conference_id", scope.canonicalConferenceId)
    .eq("country", country)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!canonicalAlloc) return null;
  return { allocation: canonicalAlloc, scope, legacyCode, matchedBy: "gateCodeCountry" };
}

async function provisionOne(admin, origin, delegate, dryRun) {
  const email = delegate.email.trim().toLowerCase();
  const name = delegate.name.trim() || email.split("@")[0];
  const legacyCode = toLegacyGateCode(delegate.placardCode);
  const resolved = await resolveAllocation(admin, delegate, legacyCode);

  if (!resolved) {
    return {
      email,
      ok: false,
      error: `No allocation for ${delegate.delegation} in ${delegate.sheet} (code ${delegate.placardCode})`,
    };
  }

  const { allocation, scope } = resolved;
  if (allocation.user_id) {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("name, role")
      .eq("id", allocation.user_id)
      .maybeSingle();
    const existingEmailUser = await findUserByEmail(admin, email);
    if (existingEmailUser?.id === allocation.user_id) {
      return {
        email,
        ok: true,
        action: "already assigned to this seat",
        allocationId: allocation.id,
        country: allocation.country,
        legacyCode,
        matchedBy: resolved.matchedBy,
      };
    }
    return {
      email,
      ok: false,
      error: `Seat ${allocation.country} already assigned to ${existingProfile?.name ?? allocation.user_id}`,
    };
  }

  if (dryRun) {
    return {
      email,
      ok: true,
      dryRun: true,
      name,
      legacyCode,
      matchedBy: resolved.matchedBy,
      allocationId: allocation.id,
      country: allocation.country,
      conferenceId: scope.canonicalConferenceId,
    };
  }

  let existing = await findUserByEmail(admin, email);
  let userId = existing?.id ?? null;
  let action;

  if (existing) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const role = profile?.role?.toString().toLowerCase() ?? "delegate";
    if (role !== "delegate") {
      return {
        email,
        ok: false,
        error: `Existing account has role "${role}" — not overwritten`,
      };
    }
    action = "assigned existing delegate account";
  } else {
    if (!origin) {
      return { email, ok: false, error: "NEXT_PUBLIC_APP_URL required for invites" };
    }
    const created = await createDelegateUser(admin, origin, email, name);
    if (!created.userId) {
      return { email, ok: false, error: created.error ?? "Could not create user" };
    }
    userId = created.userId;
    action = created.action;
  }

  await admin
    .from("allocations")
    .update({ user_id: null })
    .eq("conference_id", scope.canonicalConferenceId)
    .eq("user_id", userId)
    .neq("id", allocation.id);

  const { error: assignErr } = await admin
    .from("allocations")
    .update({ user_id: userId })
    .eq("id", allocation.id)
    .eq("conference_id", scope.canonicalConferenceId)
    .is("user_id", null);
  if (assignErr) {
    return { email, ok: false, error: `Allocation assign failed: ${assignErr.message}` };
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ role: "delegate", name, allocation: allocation.country, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileErr) {
    return { email, ok: false, error: `Profile update failed: ${profileErr.message}` };
  }

  return {
    email,
    ok: true,
    action,
    userId,
    name,
    legacyCode,
    matchedBy: resolved.matchedBy,
    allocationId: allocation.id,
    country: allocation.country,
  };
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const delayMs = Number(args.find((a) => a.startsWith("--delay-ms="))?.split("=")[1] ?? "1200");
  const xlsxPath = args.find((a) => !a.startsWith("--"));

  if (!xlsxPath) {
    console.error("Usage: node scripts/provision-delegates-from-matrix.mjs <matrix.xlsx> [--dry-run]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    ""
  );

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const delegates = parseDelegates(xlsxPath);
  if (!delegates.length) {
    console.error("No delegates with email found in spreadsheet.");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = [];
  for (const delegate of delegates) {
    results.push(await provisionOne(admin, origin, delegate, dryRun));
    if (!dryRun && delayMs > 0) await sleep(delayMs);
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log(
    JSON.stringify(
      {
        dryRun,
        total: results.length,
        succeeded: ok.length,
        failed: failed.length,
        results,
      },
      null,
      2
    )
  );

  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
