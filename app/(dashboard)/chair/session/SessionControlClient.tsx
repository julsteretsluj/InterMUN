"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Alloc = { id: string; country: string };
type QueueRow = {
  id: string;
  sort_order: number;
  label: string | null;
  status: string;
  allocation_id: string | null;
};
type RollRow = {
  allocation_id: string;
  present: boolean;
  allocations: { country: string } | { country: string }[] | null;
};
type Announcement = { id: string; body: string; created_at: string };

export function SessionControlClient({
  conferenceId,
  conferenceTitle,
}: {
  conferenceId: string;
  conferenceTitle: string;
}) {
  const supabase = createClient();
  const [allocations, setAllocations] = useState<Alloc[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [roll, setRoll] = useState<RollRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [daisBody, setDaisBody] = useState("");
  const [timer, setTimer] = useState({
    current: "",
    next: "",
    leftM: "5",
    leftS: "0",
    totalM: "5",
    totalS: "0",
  });
  const [pickAlloc, setPickAlloc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const [{ data: allocs }, { data: q }, { data: r }, { data: ann }, { data: t }] =
      await Promise.all([
        supabase
          .from("allocations")
          .select("id, country")
          .eq("conference_id", conferenceId)
          .order("country"),
        supabase
          .from("speaker_queue_entries")
          .select("id, sort_order, label, status, allocation_id")
          .eq("conference_id", conferenceId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("roll_call_entries")
          .select("allocation_id, present, allocations(country)")
          .eq("conference_id", conferenceId)
          .order("allocation_id"),
        supabase
          .from("dais_announcements")
          .select("id, body, created_at")
          .eq("conference_id", conferenceId)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase.from("timers").select("*").eq("conference_id", conferenceId).maybeSingle(),
      ]);

    setAllocations((allocs as Alloc[]) ?? []);
    setQueue((q as QueueRow[]) ?? []);
    setRoll((r as RollRow[]) ?? []);
    setAnnouncements((ann as Announcement[]) ?? []);

    if (t) {
      const tl = t.time_left_seconds ?? 0;
      const tt = t.total_time_seconds ?? 0;
      setTimer({
        current: t.current_speaker ?? "",
        next: t.next_speaker ?? "",
        leftM: String(Math.floor(tl / 60)),
        leftS: String(tl % 60),
        totalM: String(Math.floor(tt / 60)),
        totalS: String(tt % 60),
      });
    }
  }, [supabase, conferenceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel(`chair-session-${conferenceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "speaker_queue_entries" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roll_call_entries" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timers" },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, refresh]);

  function parseTime(m: string, s: string) {
    const mi = Math.max(0, parseInt(m, 10) || 0);
    const se = Math.max(0, parseInt(s, 10) || 0);
    return mi * 60 + se;
  }

  function saveTimer() {
    startTransition(async () => {
      const left = parseTime(timer.leftM, timer.leftS);
      const total = parseTime(timer.totalM, timer.totalS);
      const { error } = await supabase.from("timers").upsert(
        {
          conference_id: conferenceId,
          current_speaker: timer.current.trim() || null,
          next_speaker: timer.next.trim() || null,
          time_left_seconds: left,
          total_time_seconds: total || left,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conference_id" }
      );
      setMsg(error ? error.message : "Timer saved.");
    });
  }

  function postDais() {
    const body = daisBody.trim();
    if (!body) return;
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("dais_announcements").insert({
        conference_id: conferenceId,
        body,
        created_by: user.id,
      });
      if (!error) setDaisBody("");
      setMsg(error ? error.message : "Announcement posted.");
      void refresh();
    });
  }

  function addSpeaker() {
    if (!pickAlloc) return;
    const a = allocations.find((x) => x.id === pickAlloc);
    if (!a) return;
    startTransition(async () => {
      const max = queue.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const { error } = await supabase.from("speaker_queue_entries").insert({
        conference_id: conferenceId,
        allocation_id: a.id,
        label: a.country,
        sort_order: max + 1,
        status: "waiting",
      });
      setMsg(error ? error.message : "Added to queue.");
      void refresh();
    });
  }

  function removeQueue(id: string) {
    startTransition(async () => {
      await supabase.from("speaker_queue_entries").delete().eq("id", id);
      void refresh();
    });
  }

  function setCurrent(id: string) {
    startTransition(async () => {
      await supabase
        .from("speaker_queue_entries")
        .update({ status: "waiting" })
        .eq("conference_id", conferenceId);
      await supabase.from("speaker_queue_entries").update({ status: "current" }).eq("id", id);
      void refresh();
    });
  }

  function initRollCall() {
    startTransition(async () => {
      const rows = allocations.map((a) => ({
        conference_id: conferenceId,
        allocation_id: a.id,
        present: false,
      }));
      if (!rows.length) {
        setMsg("No allocations to add.");
        return;
      }
      const { data: existing } = await supabase
        .from("roll_call_entries")
        .select("allocation_id")
        .eq("conference_id", conferenceId);
      const have = new Set((existing ?? []).map((r) => r.allocation_id));
      const newRows = rows.filter((r) => !have.has(r.allocation_id));
      if (!newRows.length) {
        setMsg("Roll call already has a row for every allocation.");
        void refresh();
        return;
      }
      const { error } = await supabase.from("roll_call_entries").insert(newRows);
      setMsg(error ? error.message : `Added ${newRows.length} roll call row(s).`);
      void refresh();
    });
  }

  function togglePresent(allocationId: string, present: boolean) {
    startTransition(async () => {
      await supabase
        .from("roll_call_entries")
        .update({ present, updated_at: new Date().toISOString() })
        .eq("conference_id", conferenceId)
        .eq("allocation_id", allocationId);
      void refresh();
    });
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      {msg && (
        <p className="text-sm text-brand-navy bg-brand-cream border border-brand-navy/10 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Timer</h3>
        <p className="text-xs text-brand-muted">
          Delegates see this in the header when you save. Times are minutes and seconds.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-brand-muted text-xs uppercase">Current speaker</span>
            <input
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              value={timer.current}
              onChange={(e) => setTimer((t) => ({ ...t, current: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-brand-muted text-xs uppercase">Next speaker</span>
            <input
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              value={timer.next}
              onChange={(e) => setTimer((t) => ({ ...t, next: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-sm">
            <span className="text-brand-muted text-xs uppercase">Time left</span>
            <div className="flex gap-1 mt-1">
              <input
                className="w-14 px-2 py-2 rounded-lg border border-brand-navy/15"
                value={timer.leftM}
                onChange={(e) => setTimer((t) => ({ ...t, leftM: e.target.value }))}
              />
              <span className="py-2">m</span>
              <input
                className="w-14 px-2 py-2 rounded-lg border border-brand-navy/15"
                value={timer.leftS}
                onChange={(e) => setTimer((t) => ({ ...t, leftS: e.target.value }))}
              />
              <span className="py-2">s</span>
            </div>
          </label>
          <label className="text-sm">
            <span className="text-brand-muted text-xs uppercase">Total</span>
            <div className="flex gap-1 mt-1">
              <input
                className="w-14 px-2 py-2 rounded-lg border border-brand-navy/15"
                value={timer.totalM}
                onChange={(e) => setTimer((t) => ({ ...t, totalM: e.target.value }))}
              />
              <span className="py-2">m</span>
              <input
                className="w-14 px-2 py-2 rounded-lg border border-brand-navy/15"
                value={timer.totalS}
                onChange={(e) => setTimer((t) => ({ ...t, totalS: e.target.value }))}
              />
              <span className="py-2">s</span>
            </div>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={saveTimer}
            className="px-4 py-2 rounded-lg bg-brand-navy text-brand-paper text-sm font-medium hover:opacity-90"
          >
            Save timer
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Dais announcements</h3>
        <textarea
          className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-brand-navy/15"
          placeholder="Message to the committee…"
          value={daisBody}
          onChange={(e) => setDaisBody(e.target.value)}
        />
        <button
          type="button"
          disabled={pending}
          onClick={postDais}
          className="px-4 py-2 rounded-lg bg-brand-gold text-brand-navy text-sm font-medium"
        >
          Post
        </button>
        <ul className="text-sm space-y-1 border-t border-brand-navy/10 pt-3">
          {announcements.map((a) => (
            <li key={a.id} className="text-brand-muted">
              {a.body}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Speakers queue</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm flex-1 min-w-[12rem]">
            <span className="text-brand-muted text-xs uppercase">Add allocation</span>
            <select
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              value={pickAlloc}
              onChange={(e) => setPickAlloc(e.target.value)}
            >
              <option value="">Select…</option>
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.country}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={addSpeaker}
            className="px-4 py-2 rounded-lg border border-brand-navy/20 text-sm font-medium"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {queue.map((q) => (
            <li
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-brand-navy/5"
            >
              <span className="font-medium text-brand-navy">
                {q.label || "—"}{" "}
                <span className="text-xs font-normal text-brand-muted">({q.status})</span>
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-brand-gold hover:underline"
                  onClick={() => setCurrent(q.id)}
                >
                  Current
                </button>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => removeQueue(q.id)}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Roll call</h3>
        <button
          type="button"
          disabled={pending}
          onClick={initRollCall}
          className="px-4 py-2 rounded-lg border border-brand-navy/20 text-sm font-medium"
        >
          Initialize rows (all allocations)
        </button>
        <ul className="space-y-2">
          {roll.map((r) => {
            const emb = r.allocations;
            const row = Array.isArray(emb) ? emb[0] : emb;
            const country = row?.country ?? r.allocation_id.slice(0, 8);
            return (
              <li key={r.allocation_id} className="flex items-center justify-between gap-2 text-sm">
                <span>{country}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.present}
                    onChange={(e) => togglePresent(r.allocation_id, e.target.checked)}
                  />
                  Present
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
