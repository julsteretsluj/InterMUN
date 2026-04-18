"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HelpButton } from "@/components/HelpButton";

export function RequestToSpeakClient({
  conferenceId,
  allocationId,
  allocationCountry,
  disabled,
}: {
  conferenceId: string;
  allocationId: string | null;
  allocationCountry: string | null;
  disabled?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [purpose, setPurpose] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const country = allocationCountry ?? "Delegate";

  async function request() {
    if (!allocationId) {
      setMsg("You need an allocation to request to speak.");
      return;
    }

    setPending(true);
    setMsg(null);
    try {
      // Dedupe: one active waiting/current entry per allocation.
      const { data: existing, error: existingErr } = await supabase
        .from("speaker_queue_entries")
        .select("id,status")
        .eq("conference_id", conferenceId)
        .eq("allocation_id", allocationId)
        .in("status", ["waiting", "current"]);

      if (existingErr) throw existingErr;

      if ((existing ?? []).length > 0) {
        setMsg("You already have an active speaking request in the queue.");
        return;
      }

      const { data: maxRow } = await supabase
        .from("speaker_queue_entries")
        .select("sort_order")
        .eq("conference_id", conferenceId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

      const trimmedPurpose = purpose.trim();
      const label = trimmedPurpose ? `${country} - ${trimmedPurpose}` : country;

      const { error: insErr } = await supabase.from("speaker_queue_entries").insert({
        conference_id: conferenceId,
        allocation_id: allocationId,
        sort_order: nextSortOrder,
        label,
        status: "waiting",
      });

      if (insErr) throw insErr;

      setMsg("Requested to speak. You’ll appear in the queue.");
      setPurpose("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to request to speak.";
      setMsg(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-navy/10 bg-white/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-brand-navy">Request to speak</h3>
        <HelpButton title="Request to speak">
          Sends your delegation to the chair queue. You can have one active waiting/current request at a time.
        </HelpButton>
      </div>
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs text-brand-muted uppercase tracking-wider">
          Optional purpose (shows in queue label)
        </label>
        <HelpButton title="Purpose label">
          This text is appended to your country name so chairs can see why you are requesting the floor.
        </HelpButton>
      </div>
      <input
        className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="e.g. support + amendment overview"
        disabled={pending || !allocationId || disabled}
      />
      <button
        type="button"
        onClick={() => void request()}
        disabled={pending || !allocationId || disabled}
        className="w-full px-3 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Requesting…" : "Request to speak"}
      </button>
      {msg ? (
        <p className="text-xs text-brand-muted bg-brand-paper border border-brand-navy/10 rounded-lg px-3 py-2">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

