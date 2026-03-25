import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { SmtConferenceSettingsClient } from "./SmtConferenceSettingsClient";
import Link from "next/link";

export default async function SmtConferencePage() {
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  let eventRow: {
    id: string;
    name: string;
    tagline: string | null;
    event_code: string;
  } | null = null;

  if (eventId) {
    const { data } = await supabase
      .from("conference_events")
      .select("id, name, tagline, event_code")
      .eq("id", eventId)
      .maybeSingle();
    eventRow = data;
  }

  const { data: committees } = eventId
    ? await supabase
        .from("conferences")
        .select("id, name, committee, tagline, committee_code")
        .eq("event_id", eventId)
        .order("name", { ascending: true })
    : { data: [] as { id: string; name: string; committee: string | null; tagline: string | null; committee_code: string | null }[] };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-brand-navy mb-2">Conference & committees</h1>
      {!eventId ? (
        <div className="rounded-xl border border-brand-navy/10 bg-brand-paper p-6 text-sm text-brand-muted mb-6">
          Choose an event first:{" "}
          <Link href="/event-gate?next=%2Fsmt%2Fconference" className="text-brand-gold font-medium underline">
            Enter conference code
          </Link>
          .
        </div>
      ) : null}
      <SmtConferenceSettingsClient eventRow={eventRow} committees={committees ?? []} />
    </div>
  );
}
