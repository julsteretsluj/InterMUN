import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";

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
          className="inline-block px-4 py-2 rounded-lg bg-brand-navy text-brand-paper font-medium hover:bg-brand-navy-soft"
        >
          Enter conference code
        </Link>
      </div>
    );
  }

  const { data: committees } = await supabase
    .from("conferences")
    .select("id, name, committee, tagline, committee_code")
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const list = committees ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-brand-muted text-sm">
        No committees found for this event. Add them in{" "}
        <Link href="/smt/conference" className="text-brand-gold font-medium hover:underline">
          Conference & committees
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
      <h1 className="font-display text-3xl font-semibold text-brand-navy mb-2">Welcome Sec Gen!</h1>
      <p className="text-base text-brand-navy mb-6">Which committee would you like to check in on?</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Link
            key={c.id}
            href={`/smt/committees/${c.id}`}
            className="rounded-xl border border-brand-navy/15 bg-brand-paper px-4 py-3 text-brand-navy shadow-sm hover:bg-brand-cream transition-colors"
          >
            <p className="font-semibold text-sm">
              {[c.name, c.committee].filter(Boolean).join(" — ") || "Committee"}
            </p>
            {c.committee_code ? <p className="text-xs font-mono text-brand-navy/70 mt-1">{c.committee_code}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
