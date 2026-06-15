#!/usr/bin/env node
/**
 * Invite or promote a secretariat (SMT) account by email.
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL
 *
 * Usage:
 *   node scripts/invite-smt-user.mjs chrissy.nagle@verso.ac.th "Chrissy Nagle"
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
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

loadEnvLocal();

const email = (process.argv[2] ?? "").trim().toLowerCase();
const displayName = (process.argv[3] ?? "").trim() || email.split("@")[0] || "SMT";

if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/invite-smt-user.mjs <email> [display name]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const origin = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "")
  .replace(/\/$/, "");

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(target) {
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

async function main() {
  const existing = await findUserByEmail(email);
  let userId = existing?.id ?? null;
  let action;

  if (existing) {
    action = "promoted existing account to SMT";
  } else {
    if (!origin) {
      console.error("Set NEXT_PUBLIC_APP_URL in .env.local for invite redirect");
      process.exit(1);
    }
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/login`,
    });
    if (error) {
      console.error("Invite failed:", error.message);
      process.exit(1);
    }
    userId = data?.user?.id ?? null;
    action = "invite email sent";
    if (!userId) {
      userId = (await findUserByEmail(email))?.id ?? null;
    }
  }

  if (!userId) {
    console.error("Could not resolve user id for", email);
    process.exit(1);
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ role: "smt", name: displayName })
    .eq("id", userId);

  if (profileErr) {
    console.error("Profile update failed:", profileErr.message);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        name: displayName,
        userId,
        action,
        nextStep: existing
          ? "They can sign in at /login with their existing password."
          : "They must open the invite email and set a password, then sign in at /login.",
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
