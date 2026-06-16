#!/usr/bin/env node
/**
 * Invite or promote an advisor account and optionally link registered delegates by school.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL
 *
 * Usage:
 *   node scripts/invite-advisor-user.mjs wendto@delasalle.school.nz "Otto Wendt" "De La Salle College"
 *   node scripts/invite-advisor-user.mjs wendto@delasalle.school.nz "Otto Wendt" "De La Salle College" --matrix "/path/to/matrix.xlsx"
 */

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SHEET_COMMITTEE_KEY = {
  PC: "Press Corps",
  FWC: "FWC - Stranger Things",
  INTERPOL: "Interpol",
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

function committeeFromSheet(sheet) {
  return SHEET_COMMITTEE_KEY[sheet] ?? sheet;
}

function parseSchoolDelegates(matrixPath, schoolName) {
  const py = path.join(__dirname, "parse-delegate-registrations.py");
  const result = spawnSync("python3", [py, matrixPath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to parse spreadsheet");
  }
  const needle = schoolName.trim().toLowerCase();
  return JSON.parse(result.stdout).filter((d) => {
    const rowSchool = (d.school ?? "").trim().toLowerCase();
    return rowSchool === needle || rowSchool.includes(needle);
  });
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

async function createAdvisorUser(admin, origin, email, name) {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/login`,
  });
  if (!error) {
    let userId = data?.user?.id ?? null;
    if (!userId) userId = (await findUserByEmail(admin, email))?.id ?? null;
    return { userId, action: "invite email sent" };
  }

  const msg = error.message?.toLowerCase() ?? "";
  if (msg.includes("already") || msg.includes("registered")) {
    const existing = await findUserByEmail(admin, email);
    if (existing) return { userId: existing.id, action: "promoted existing account to advisor" };
    return { userId: null, action: null, error: error.message };
  }

  if (/rate limit/i.test(error.message)) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr) return { userId: null, action: null, error: createErr.message };
    return {
      userId: created.user?.id ?? null,
      action: "account created (invite rate limit — use Forgot password at /login)",
    };
  }

  return { userId: null, action: null, error: error.message };
}

async function findCanonicalConferenceForCommittee(admin, committee) {
  const { data: rows, error } = await admin
    .from("conferences")
    .select("id, committee, name, created_at")
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
  return sorted[0].id;
}

async function resolveDelegateAllocation(admin, delegate) {
  const committee = committeeFromSheet(delegate.sheet);
  const conferenceId = await findCanonicalConferenceForCommittee(admin, committee);
  if (!conferenceId) return null;

  const { data: alloc, error } = await admin
    .from("allocations")
    .select("id, conference_id, country, user_id, profiles:user_id ( role )")
    .eq("conference_id", conferenceId)
    .eq("country", delegate.delegation)
    .maybeSingle();
  if (error) throw error;
  if (!alloc?.user_id) return null;

  const roleRaw = alloc.profiles;
  const role = Array.isArray(roleRaw) ? roleRaw[0]?.role : roleRaw?.role;
  if (role?.toString().toLowerCase() !== "delegate") return null;
  return alloc;
}

async function main() {
  loadEnvLocal();
  const argv = process.argv.slice(2);
  const matrixIdx = argv.indexOf("--matrix");
  const matrixPath = matrixIdx >= 0 ? argv[matrixIdx + 1] : null;
  const positional = argv.filter((a, i) => a !== "--matrix" && (matrixIdx < 0 || i !== matrixIdx + 1));

  const email = (positional[0] ?? "").trim().toLowerCase();
  const displayName = (positional[1] ?? "").trim() || email.split("@")[0] || "Advisor";
  const school = (positional[2] ?? "").trim();

  if (!email || !email.includes("@")) {
    console.error(
      'Usage: node scripts/invite-advisor-user.mjs <email> "Name" "School" [--matrix path.xlsx]'
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
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created = await createAdvisorUser(admin, origin, email, displayName);
  if (!created.userId) {
    console.error(created.error ?? "Could not create advisor user");
    process.exit(1);
  }

  const userId = created.userId;
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      role: "advisor",
      name: displayName,
      school: school || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileErr) {
    console.error("Profile update failed:", profileErr.message);
    process.exit(1);
  }

  const assignments = [];
  const skipped = [];

  if (matrixPath && school) {
    const delegates = parseSchoolDelegates(matrixPath, school);
    for (const delegate of delegates) {
      if (!delegate.email) {
        skipped.push({ delegation: delegate.delegation, sheet: delegate.sheet, reason: "no email" });
        continue;
      }
      const alloc = await resolveDelegateAllocation(admin, delegate);
      if (!alloc) {
        skipped.push({
          delegation: delegate.delegation,
          sheet: delegate.sheet,
          email: delegate.email,
          reason: "delegate not registered or seat unassigned",
        });
        continue;
      }

      const { error: upsertErr } = await admin.from("advisor_delegate_assignments").upsert(
        {
          advisor_profile_id: userId,
          delegate_allocation_id: alloc.id,
          conference_id: alloc.conference_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "delegate_allocation_id" }
      );
      if (upsertErr) {
        skipped.push({
          delegation: delegate.delegation,
          sheet: delegate.sheet,
          email: delegate.email,
          reason: upsertErr.message,
        });
        continue;
      }
      assignments.push({
        delegation: delegate.delegation,
        sheet: delegate.sheet,
        email: delegate.email,
        allocationId: alloc.id,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        name: displayName,
        school: school || null,
        userId,
        action: created.action,
        assignments,
        skipped,
        nextStep:
          created.action.includes("invite")
            ? "Open the invite email and set a password, then sign in at /login."
            : "Sign in at /login (use Forgot password if needed).",
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
