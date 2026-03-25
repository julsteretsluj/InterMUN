import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { Timers } from "@/components/timers/Timers";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";

export default async function SmtCommitteeLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  const { data: conf } = await supabase
    .from("conferences")
    .select("id, event_id, name, committee, tagline, committee_code")
    .eq("id", id)
    .maybeSingle();

  if (!conf) notFound();

  if (eventId && conf.event_id !== eventId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-brand-navy">
        This committee belongs to a different conference than the one you have selected.{" "}
        <Link href="/event-gate?next=%2Fsmt" className="text-brand-gold font-medium underline">
          Switch event
        </Link>{" "}
        or open it from{" "}
        <Link href="/smt" className="text-brand-gold font-medium underline">
          Live committees
        </Link>
        .
      </div>
    );
  }

  const heading = [conf.name, conf.committee].filter(Boolean).join(" — ");

  return (
    <div>
      <Link href="/smt" className="text-sm text-brand-gold hover:underline mb-4 inline-block">
        ← All committees
      </Link>
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-navy">{heading}</h1>
          {conf.tagline ? <p className="text-sm text-brand-muted mt-1">{conf.tagline}</p> : null}
          {conf.committee_code ? (
            <p className="text-xs font-mono text-brand-navy/70 mt-2">Code: {conf.committee_code}</p>
          ) : null}
        </div>
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Timer</h2>
          <Timers conferenceId={conf.id} theme="light" />
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Floor</h2>
          <FloorStatusBar conferenceId={conf.id} observeOnly theme="light" />
        </section>
        <p className="text-xs text-brand-muted pt-2 border-t border-brand-navy/10">
          Read-only view for secretariat. Chairs control the dais from{" "}
          <span className="font-medium">Session floor</span> in the chair dashboard.
        </p>
      </div>
    </div>
  );
}
