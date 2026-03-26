import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { SMT_COMMITTEE_CODE } from "@/lib/join-codes";
import { formatCommitteeCardTitle } from "@/lib/committee-card-display";

export default async function SmtOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e: overviewErr } = await searchParams;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">No conference is selected. Enter your event code first.</p>
        <Link
          href="/event-gate?next=%2Fsmt"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          Enter conference code
        </Link>
      </div>
    );
  }

  const { data: committees } = await supabase
    .from("conferences")
    .select(
      "id, name, committee, tagline, committee_code, committee_full_name, chair_names, committee_logo_url, created_at"
    )
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const rows = (committees ?? []).filter((c) => {
    const code = c.committee_code?.trim().toUpperCase() ?? "";
    return code !== SMT_COMMITTEE_CODE;
  });

  type Row = (typeof rows)[number];

  const groups = new Map<
    string,
    { code: string; latestId: string; latestRow: Row; topicCount: number }
  >();

  for (const r of rows) {
    const code = r.committee_code?.trim().toUpperCase();
    if (!code) continue;

    const existing = groups.get(code);
    if (!existing) {
      groups.set(code, { code, latestId: r.id, latestRow: r, topicCount: 1 });
      continue;
    }

    const existingTime = existing.latestRow.created_at
      ? new Date(existing.latestRow.created_at).getTime()
      : 0;
    const nextTime = r.created_at ? new Date(r.created_at).getTime() : 0;
    const latestRow = nextTime > existingTime ? r : existing.latestRow;

    groups.set(code, {
      ...existing,
      latestId: latestRow.id,
      latestRow,
      topicCount: existing.topicCount + 1,
    });
  }

  const list = Array.from(groups.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-brand-muted text-sm">
        No committees found for this event. Add them in{" "}
        <Link href="/smt/conference" className="text-brand-gold font-medium hover:underline">
          Event & committee sessions
        </Link>{" "}
        or in Supabase.
      </div>
    );
  }

  return (
    <div>
      {overviewErr === "smt-no-session-floor" && (
        <div
          className="mb-6 rounded-lg border border-brand-gold/40 bg-brand-cream/60 px-4 py-3 text-sm text-brand-navy"
          role="status"
        >
          <strong>Session floor</strong> (timers, speakers, roll call) is for <strong>dais chairs</strong>{" "}
          only. Use <strong>Live committees</strong> below for oversight, or enter committee codes like
          delegates when you need a specific session.
        </div>
      )}
      <h1 className="font-display text-3xl font-semibold text-brand-navy mb-2">
        Welcome Secretary General!
      </h1>
      <p className="text-base text-brand-navy mb-6">Which committee would you like to check in on?</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <Link
            key={g.code}
            href={`/smt/committees/${g.latestId}`}
            className="rounded-xl border border-brand-navy/15 bg-brand-paper px-4 py-3 text-brand-navy shadow-sm hover:bg-brand-cream transition-colors"
          >
            {g.latestRow.committee_logo_url ? (
              <img
                src={g.latestRow.committee_logo_url}
                alt={`${g.latestRow.committee ?? "Committee"} logo`}
                className="h-10 w-10 object-contain rounded-md bg-white/60 border border-brand-navy/10 mb-2"
              />
            ) : null}
            <p className="font-semibold text-sm leading-snug">
              {formatCommitteeCardTitle(g.latestRow.committee_full_name, g.latestRow.committee)}
            </p>
            {g.latestRow.chair_names?.trim() ? (
              <p className="text-xs text-brand-muted mt-2">
                <span className="font-medium text-brand-navy/80">Chairs: </span>
                {g.latestRow.chair_names.trim()}
              </p>
            ) : null}
            {g.code ? (
              <p className="text-xs font-mono text-brand-navy/70 mt-2 tracking-widest">{g.code}</p>
            ) : null}
            {g.topicCount > 1 ? (
              <p className="text-[0.68rem] text-brand-muted mt-1">{g.topicCount} sessions</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
