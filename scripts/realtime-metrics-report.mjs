import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and service/anon key env vars.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const [{ data: outbox, error: outboxErr }, { data: status, error: statusErr }] = await Promise.all([
    supabase.from("realtime_note_outbox_health").select("*").order("oldest_queued_at", { ascending: true }),
    supabase.from("realtime_delivery_status_counts").select("*").order("conference_id", { ascending: true }),
  ]);

  if (outboxErr) throw outboxErr;
  if (statusErr) throw statusErr;

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), outbox: outbox ?? [], status: status ?? [] }, null, 2));
}

run().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
