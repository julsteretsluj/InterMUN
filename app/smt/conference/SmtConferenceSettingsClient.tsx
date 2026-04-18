"use client";

import { useActionState, useState } from "react";
import {
  updateConferenceEventAction,
  updateCommitteeSessionAction,
  type SmtFormState,
} from "@/app/actions/smtConference";
import { generateSixCharCommitteeCode } from "@/lib/committee-join-code";
import { createClient } from "@/lib/supabase/client";

type EventRow = { id: string; name: string; tagline: string | null; event_code: string };
type CommitteeRow = {
  id: string;
  event_id: string;
  name: string;
  committee: string | null;
  tagline: string | null;
  committee_code: string | null;
  committee_full_name: string | null;
  chair_names: string | null;
  committee_logo_url: string | null;
  crisis_slides_url: string | null;
  consultation_before_moderated_caucus?: boolean | null;
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
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-4">Event details</h2>
        {!eventRow ? (
          <p className="text-sm text-brand-muted">
            Select a conference with the event gate first, then return here.
          </p>
        ) : (
          <EventForm eventRow={eventRow} />
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-brand-navy mb-2">
          Committee sessions in this event
        </h2>
        <p className="text-sm text-brand-muted mb-6">
          Committee session titles (agenda topics) stay here for records; the SMT home grid shows the
          official committee name, acronym, chairs, and a short display code. Committee / room codes
          (second gate) must stay unique within this event.
        </p>
        <div className="space-y-8">
          {committees.length === 0 ? (
            <p className="text-sm text-brand-muted">No committee sessions for this event.</p>
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
      {state?.success && <p className="text-sm text-brand-navy">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save conference event"}
      </button>
    </form>
  );
}

function CommitteeForm({ row }: { row: CommitteeRow }) {
  const [state, action, pending] = useActionState(updateCommitteeSessionAction, null as SmtFormState | null);
  const suggestedCode = generateSixCharCommitteeCode(row.committee ?? "", row.id);
  const supabase = createClient();

  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState(row.committee_logo_url ?? "");

  async function uploadCommitteeLogo(file: File) {
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size && file.size > 6 * 1024 * 1024) {
      setUploadError("Image is too large (max 6 MB).");
      return;
    }
    if (!row.committee_code) {
      setUploadError("Committee code is missing.");
      return;
    }

    setUploadPending(true);
    try {
      const bucketName = "committee-logos";
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "png";

      const objectPath = `committees/${row.event_id}/${row.committee_code}/${Date.now()}.${safeExt}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
      if (!publicUrlData?.publicUrl) {
        throw new Error("Could not resolve public URL for uploaded image.");
      }

      // Persist immediately; apply to all topic rows for this committee in this event.
      const { error: updateErr } = await supabase
        .from("conferences")
        .update({ committee_logo_url: publicUrlData.publicUrl })
        .eq("event_id", row.event_id)
        .eq("committee_code", row.committee_code);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setLogoUrl(publicUrlData.publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setUploadPending(false);
    }
  }

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
        <label className="block text-xs font-medium text-brand-muted mb-1">
          Official committee name (SMT grid)
        </label>
        <input
          name="committee_full_name"
          defaultValue={row.committee_full_name ?? ""}
          placeholder="e.g. World Health Organization"
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">Chair names</label>
        <input
          name="chair_names"
          defaultValue={row.chair_names ?? ""}
          placeholder="Comma-separated, e.g. Alex Kim, Jordan Lee"
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        />
      </div>

      <div className="pt-1">
        <label className="block text-xs font-medium text-brand-muted mb-1">Committee logo</label>

        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Committee logo"
            className="h-16 w-16 rounded-md object-contain bg-white/70 border border-brand-navy/10 mb-2"
          />
        ) : (
          <div className="h-16 w-16 rounded-md object-contain bg-white/30 border border-brand-navy/10 mb-2 text-center text-[0.65rem] leading-[4rem] text-brand-muted">
            —
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          disabled={uploadPending}
          className="w-full"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void uploadCommitteeLogo(file);
          }}
        />
        {uploadPending ? (
          <p className="text-xs text-brand-muted mt-1">Uploading…</p>
        ) : null}
        {uploadError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 mt-2">
            {uploadError}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">
          Crisis slides (Google Slides URL)
        </label>
        <input
          name="crisis_slides_url"
          type="url"
          defaultValue={row.crisis_slides_url ?? ""}
          placeholder="https://docs.google.com/presentation/d/…/edit"
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm font-mono"
        />
        <p className="text-xs text-brand-muted mt-1">
          For FWC / UNSC / HSC: embedded on delegates’ and chairs’ <span className="font-medium">Crisis slides</span>{" "}
          page. Leave blank if not used. Deck should allow viewing for your audience (link sharing).
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-brand-navy/15 bg-white/60 px-3 py-2.5 text-sm text-brand-navy">
        <input
          type="checkbox"
          name="consultation_before_moderated_caucus"
          value="on"
          defaultChecked={row.consultation_before_moderated_caucus !== false}
          className="mt-0.5 size-4 rounded border-brand-navy/25 text-brand-accent focus:ring-brand-accent"
        />
        <span>
          <span className="font-medium">Competing motions (RoP): consultation before moderated caucus</span>
          <span className="block text-xs text-brand-muted mt-1">
            Uncheck if your handbook ranks a <span className="font-medium">moderated caucus</span> motion above{" "}
            <span className="font-medium">consultation</span> when both are pending.
          </span>
        </span>
      </label>

      <div>
        <label className="block text-xs font-medium text-brand-muted mb-1">
          Committee / room code (second gate)
        </label>
        <input
          name="committee_code"
          required
          minLength={6}
          maxLength={6}
          pattern="[A-Za-z0-9]{6}"
          title="Exactly 6 letters or digits"
          defaultValue={row.committee_code ?? ""}
          placeholder="e.g. ECO741"
          className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 font-mono text-sm tracking-widest"
        />
        <p className="text-xs text-brand-muted mt-1">
          Six characters: chamber initials + three digits (deterministic suggestion:{" "}
          <span className="font-mono text-brand-navy">{suggestedCode}</span>).
        </p>
      </div>
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">{state.error}</p>
      )}
      {state?.success && <p className="text-xs text-brand-navy">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-sm px-3 py-1.5 rounded-lg bg-brand-accent text-white font-medium disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save committee"}
      </button>
    </form>
  );
}
