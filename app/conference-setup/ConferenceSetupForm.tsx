"use client";

import { useActionState, useEffect } from "react";
import { createConferenceAsStaff } from "@/app/actions/conferenceSetup";

type Props = { nextPath: string };

export function ConferenceSetupForm({ nextPath }: Props) {
  const [state, formAction, pending] = useActionState(
    createConferenceAsStaff,
    null as { error?: string } | null
  );

  useEffect(() => {
    if (state?.error) {
      document.getElementById("conference-setup-error")?.focus();
    }
  }, [state?.error]);

  const committeeOptions = [
    "African Union",
    "Arab League",
    "ASEAN",
    "CCPCJ",
    "DISEC",
    "ECOFIN",
    "ECOSOC",
    "EU",
    "F1",
    "FIFA",
    "Fantasy World Committee",
    "HSC",
    "HRC",
    "HCR",
    "IAEA",
    "ICAO",
    "ICC",
    "ICJ",
    "Interpol",
    "IOPC",
    "NATO",
    "Press Corps",
    "US Senate",
    "SOCHUM",
    "SPECPOL",
    "CSA",
    "UNDP",
    "UNEP",
    "UNESCO",
    "UNICEF",
    "UNODC",
    "UNSC",
    "WHO",
    "WIPO",
    "WTO",
  ];

  return (
    <form action={formAction} className="space-y-5 text-left">
      <input type="hidden" name="next" value={nextPath} />

      <div className="rounded-lg border border-brand-gold/30 bg-brand-cream/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy">Conference (first gate)</p>

        <div>
          <label
            htmlFor="event-name"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Conference / event name <span className="text-red-600">*</span>
          </label>
          <input
            id="event-name"
            name="event_name"
            type="text"
            required
            minLength={2}
            autoComplete="organization"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="e.g. Southeast Asia Model UN 2027"
          />
          <p className="text-xs text-brand-muted mt-1">Shown to organisers; delegates see it after they join.</p>
        </div>

        <div>
          <label
            htmlFor="event-code"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Conference code <span className="text-red-600">*</span>
          </label>
          <input
            id="event-code"
            name="event_code"
            type="text"
            required
            minLength={4}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="e.g. SEAMUNI2027"
          />
          <p className="text-xs text-brand-muted mt-1">
            Everyone enters this first (whole conference). Spaces ignored; stored in capitals. Must be
            unique.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-navy/15 bg-white/60 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy">First committee (second gate)</p>

        <div>
          <label
            htmlFor="session-name"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Committee session title <span className="text-red-600">*</span>
          </label>
          <input
            id="session-name"
            name="session_name"
            type="text"
            required
            minLength={2}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="e.g. Topic or agenda title for this committee"
          />
          <p className="text-xs text-brand-muted mt-1">Main heading for this committee in the app header.</p>
        </div>

        <div>
          <label
            htmlFor="conf-committee"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Chamber / committee label
          </label>
          <input
            id="conf-committee"
            name="committee"
            type="text"
            autoComplete="off"
            list="committee-suggestions"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="e.g. ECOSOC, UNSC"
          />
          <datalist id="committee-suggestions">
            {committeeOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="text-xs text-brand-muted mt-1">Optional. Shown next to the session title.</p>
        </div>

        <div>
          <label
            htmlFor="conf-tagline"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Tagline or theme
          </label>
          <input
            id="conf-tagline"
            name="tagline"
            type="text"
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="Optional subtitle under the header"
          />
        </div>

        <div>
          <label
            htmlFor="committee-code"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Committee code <span className="text-red-600">*</span>
          </label>
          <input
            id="committee-code"
            name="committee_code"
            type="text"
            required
            minLength={4}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="e.g. ECOSOC@SEAMUN"
          />
          <p className="text-xs text-brand-muted mt-1">
            Second gate: unique within this conference. You can use letters, digits, and symbols like @.
            Compared case-insensitively (trimmed).
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-navy/10 bg-brand-cream/40 p-4 space-y-4">
        <p className="text-xs font-medium text-brand-navy">Optional: committee password</p>
        <p className="text-xs text-brand-muted">
          Delegates confirm allocation + this password after login. Leave blank to skip.
        </p>
        <div>
          <label
            htmlFor="conf-pw"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Committee password
          </label>
          <input
            id="conf-pw"
            name="committee_password"
            type="password"
            autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="Leave empty to skip"
          />
        </div>
        <div>
          <label
            htmlFor="conf-pw2"
            className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
          >
            Confirm committee password
          </label>
          <input
            id="conf-pw2"
            name="committee_password_confirm"
            type="password"
            autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            placeholder="Same as above if using a password"
          />
        </div>
      </div>

      {state?.error && (
        <p
          id="conference-setup-error"
          tabIndex={-1}
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg bg-brand-navy text-brand-paper font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create event + committee and enter"}
      </button>
    </form>
  );
}
