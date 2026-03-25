"use client";

import { useActionState } from "react";
import {
  updateConferenceEventAction,
  updateCommitteeSessionAction,
  type SmtFormState,
} from "@/app/actions/smtConference";

type EventRow = { id: string; name: string; tagline: string | null; event_code: string };
type CommitteeRow = {
  id: string;
  name: string;
  committee: string | null;
  tagline: string | null;
  committee_code: string | null;
};

export function SmtConferenceSettingsClient({
  eventRow,
  committees,
}: {
  eventRow: EventRow | null;
  committees: CommitteeRow[];
}) {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-4">Conference event</h2>
        {!eventRow ? (
          <p className="text-sm text-brand-muted">
            Select a conference with the event gate first, then return here.
          </p>
        ) : (
          <EventForm eventRow={eventRow} />
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-2">Committees in this event</h2>
        <p className="text-sm text-brand-muted mb-6">
          Titles, taglines, and committee codes (second gate). Codes must stay unique within the event.
        </p>
        <div className="space-y-8">
          {committees.length === 0 ? (
            <p className="text-sm text-brand-muted">No committees for this event.</p>
          ) : (
            committees.map((c) => <CommitteeForm key={c.id} row={c} />)
          )}
        </div>
      </section>
    </div>
  );
}

function EventForm({ eventRow }: { eventRow: EventRow }) {
  const [state, action, pending] = useActionState(updateConferenceEventAction, null as SmtFormState | null);

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="event_id" value={eventRow.id} />
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
          Event name
        </label>
        <input
          name="name"
          required
          minLength={2}
          defaultValue={eventRow.name}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
          Tagline
        </label>
        <input
          name="tagline"
          defaultValue={eventRow.tagline ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15"
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
          Conference code (first gate)
        </label>
        <input
          name="event_code"
          required
          minLength={4}
          defaultValue={eventRow.event_code}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 font-mono"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state?.success && <p className="text-sm text-green-800">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg bg-brand-navy text-brand-paper font-medium disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save conference event"}
      </button>
    </form>
  );
}

function CommitteeForm({ row }: { row: CommitteeRow }) {
  const [state, action, pending] = useActionState(updateCommitteeSessionAction, null as SmtFormState | null);

  return (
    <form action={action} className="border border-brand-navy/10 rounded-xl p-4 space-y-3 bg-brand-cream/20">
      <input type="hidden" name="conference_id" value={row.id} />
      <p className="text-xs font-mono text-brand-muted">{row.id.slice(0, 8)}…</p>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">Session title</label>
        <input
          name="name"
          required
          minLength={2}
          defaultValue={row.name}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">Chamber / label</label>
        <input
          name="committee"
          defaultValue={row.committee ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">Tagline</label>
        <input
          name="tagline"
          defaultValue={row.tagline ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">Committee code (second gate)</label>
        <input
          name="committee_code"
          required
          minLength={4}
          defaultValue={row.committee_code ?? ""}
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">{state.error}</p>
      )}
      {state?.success && <p className="text-xs text-green-800">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-sm px-3 py-1.5 rounded-lg bg-brand-gold text-brand-navy font-medium disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save committee"}
      </button>
    </form>
  );
}
