"use client";

import { useActionState, useState } from "react";
import { setRoomCodeAndEnterAction } from "@/app/actions/roomGate";

type Conf = {
  id: string;
  name: string;
  committee: string | null;
  room_code: string | null;
};

export function RoomCodeChairForm({ conferences }: { conferences: Conf[] }) {
  const [conferenceId, setConferenceId] = useState(conferences[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(setRoomCodeAndEnterAction, null);

  const selected = conferences.find((c) => c.id === conferenceId);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <input type="hidden" name="next" value="/profile" />

      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
          Conference
        </label>
        <select
          name="conference_id"
          value={conferenceId}
          onChange={(e) => setConferenceId(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy"
        >
          {conferences.length === 0 ? (
            <option value="">No conferences</option>
          ) : (
            conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.name, c.committee].filter(Boolean).join(" — ")}
              </option>
            ))
          )}
        </select>
        {selected?.room_code && (
          <p className="text-xs text-brand-muted mt-1">
            Current code:{" "}
            <span className="font-mono font-medium text-brand-navy">{selected.room_code}</span>
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="chair-room-code"
          className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
        >
          New room code
        </label>
        <input
          id="chair-room-code"
          name="code"
          type="text"
          required
          minLength={4}
          autoComplete="off"
          className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy font-mono uppercase"
          placeholder="At least 4 characters"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || !conferenceId}
          className="px-4 py-2.5 rounded-lg bg-brand-gold text-brand-navy font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save code & enter committee"}
        </button>
      </div>
    </form>
  );
}
