import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPastAwardSubmissionDeadline } from "@/lib/award-submission";
import { promoteCommitteeDraftsToPending } from "@/lib/award-committee-submit";

/**
 * Promotes complete chair nomination batches from draft → pending after the configured deadline.
 * Schedule via your host (e.g. Vercel Cron) and set CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY.
 *
 * GET /api/cron/award-submissions?secret=CRON_SECRET
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPastAwardSubmissionDeadline()) {
    return NextResponse.json({ ok: true, skipped: "before_deadline" });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role client not configured" }, { status: 503 });
  }

  const { data: draftRows, error: listErr } = await admin
    .from("award_nominations")
    .select("committee_conference_id")
    .eq("status", "draft");

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const committeeIds = [
    ...new Set((draftRows ?? []).map((r) => r.committee_conference_id).filter(Boolean)),
  ] as string[];

  const results: { committee_conference_id: string; promoted?: boolean; reason?: string; error?: string }[] = [];

  for (const committeeConferenceId of committeeIds) {
    const r = await promoteCommitteeDraftsToPending(admin, committeeConferenceId, {
      onlyIfPastDeadline: false,
      isPastDeadline: () => true,
      requireCompleteForIncomplete: false,
    });
    if (!r.ok) {
      results.push({ committee_conference_id: committeeConferenceId, error: r.error });
    } else if (r.didPromote) {
      results.push({ committee_conference_id: committeeConferenceId, promoted: true });
    } else {
      results.push({ committee_conference_id: committeeConferenceId, reason: r.reason });
    }
  }

  return NextResponse.json({
    ok: true,
    committees: committeeIds.length,
    results,
  });
}
