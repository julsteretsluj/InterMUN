"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VoteType } from "@/types/database";

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
type MotionRow = {
  id: string;
  conference_id: string;
  vote_type: VoteType;
  title: string | null;
  description: string | null;
  must_vote: boolean;
  required_majority: string;
  closed_at: string | null;
};
type MotionAudit = {
  id: string;
  event_type: "created" | "edited" | "opened" | "closed";
  created_at: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
};
type VoteCountRow = { value: "yes" | "no" | "abstain" };

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
  const [openMotion, setOpenMotion] = useState<MotionRow | null>(null);
  const [recentMotions, setRecentMotions] = useState<MotionRow[]>([]);
  const [motionAudit, setMotionAudit] = useState<MotionAudit[]>([]);
  const [motionTally, setMotionTally] = useState({ yes: 0, no: 0, abstain: 0, total: 0 });
  const [motionDraft, setMotionDraft] = useState({
    vote_type: "motion" as VoteType,
    title: "",
    description: "",
    must_vote: false,
    required_majority: "simple",
  });

  const refresh = useCallback(async () => {
    const [
      { data: allocs },
      { data: q },
      { data: r },
      { data: ann },
      { data: t },
      { data: currentMotion },
      { data: motionRows },
    ] =
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
        supabase
          .from("vote_items")
          .select("id, conference_id, vote_type, title, description, must_vote, required_majority, closed_at")
          .eq("conference_id", conferenceId)
          .is("closed_at", null)
          .maybeSingle(),
        supabase
          .from("vote_items")
          .select("id, conference_id, vote_type, title, description, must_vote, required_majority, closed_at")
          .eq("conference_id", conferenceId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    setAllocations((allocs as Alloc[]) ?? []);
    setQueue((q as QueueRow[]) ?? []);
    setRoll((r as RollRow[]) ?? []);
    setAnnouncements((ann as Announcement[]) ?? []);
    const open = (currentMotion as MotionRow | null) ?? null;
    setOpenMotion(open);
    setRecentMotions((motionRows as MotionRow[]) ?? []);
    if (open) {
      setMotionDraft({
        vote_type: open.vote_type,
        title: open.title ?? "",
        description: open.description ?? "",
        must_vote: open.must_vote,
        required_majority: open.required_majority,
      });
    }

    const motionId = (currentMotion as MotionRow | null)?.id ?? null;
    if (motionId) {
      const [{ data: openVotes }, { data: auditRows }] = await Promise.all([
        supabase.from("votes").select("value").eq("vote_item_id", motionId),
        supabase
          .from("motion_audit_events")
          .select("id, event_type, created_at, actor_profile_id, metadata")
          .eq("vote_item_id", motionId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const rows = (openVotes ?? []) as VoteCountRow[];
      const yes = rows.filter((v) => v.value === "yes").length;
      const no = rows.filter((v) => v.value === "no").length;
      const abstain = rows.filter((v) => v.value === "abstain").length;
      setMotionTally({ yes, no, abstain, total: rows.length });
      setMotionAudit((auditRows as MotionAudit[]) ?? []);
    } else {
      setMotionTally({ yes: 0, no: 0, abstain: 0, total: 0 });
      setMotionAudit([]);
    }

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vote_items" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "motion_audit_events" },
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

  function createMotion() {
    if (!motionDraft.title.trim()) {
      setMsg("Motion title is required.");
      return;
    }
    if (openMotion) {
      setMsg("Close the current motion before opening another.");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase.from("vote_items").insert({
        conference_id: conferenceId,
        vote_type: motionDraft.vote_type,
        title: motionDraft.title.trim(),
        description: motionDraft.description.trim() || null,
        must_vote: motionDraft.must_vote,
        required_majority: motionDraft.required_majority,
      });
      setMsg(error ? error.message : "Motion created and opened.");
      if (!error) {
        setMotionDraft({
          vote_type: "motion",
          title: "",
          description: "",
          must_vote: false,
          required_majority: "simple",
        });
      }
      void refresh();
    });
  }

  function saveMotionEdits() {
    if (!openMotion) return;
    startTransition(async () => {
      const { error } = await supabase
        .from("vote_items")
        .update({
          vote_type: motionDraft.vote_type,
          title: motionDraft.title.trim() || null,
          description: motionDraft.description.trim() || null,
          must_vote: motionDraft.must_vote,
          required_majority: motionDraft.required_majority,
        })
        .eq("id", openMotion.id);
      setMsg(error ? error.message : "Motion updated.");
      void refresh();
    });
  }

  function closeMotion() {
    if (!openMotion) return;
    startTransition(async () => {
      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", openMotion.id);
      setMsg(error ? error.message : "Motion closed.");
      void refresh();
    });
  }

  function reopenMotion(voteItemId: string) {
    startTransition(async () => {
      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: null })
        .eq("id", voteItemId);
      setMsg(error ? error.message : "Motion reopened.");
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
        <h3 className="font-display text-lg font-semibold text-brand-navy">Motion control</h3>
        <p className="text-xs text-brand-muted">
          Chair-only: one open motion at a time. Delegates vote while motion is open.
        </p>
        <div className="rounded-xl border border-brand-navy/10 p-3 space-y-3 bg-white/60">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-brand-muted text-xs uppercase">Type</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
                value={motionDraft.vote_type}
                onChange={(e) =>
                  setMotionDraft((d) => ({ ...d, vote_type: e.target.value as VoteType }))
                }
              >
                <option value="motion">Motion</option>
                <option value="amendment">Amendment</option>
                <option value="resolution">Resolution</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-brand-muted text-xs uppercase">Required majority</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
                value={motionDraft.required_majority}
                onChange={(e) =>
                  setMotionDraft((d) => ({ ...d, required_majority: e.target.value }))
                }
              >
                <option value="simple">simple</option>
                <option value="2/3">2/3</option>
              </select>
            </label>
          </div>
          <label className="text-sm block">
            <span className="text-brand-muted text-xs uppercase">Title</span>
            <input
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
              value={motionDraft.title}
              onChange={(e) => setMotionDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Motion title"
            />
          </label>
          <label className="text-sm block">
            <span className="text-brand-muted text-xs uppercase">Description</span>
            <textarea
              className="mt-1 w-full min-h-[72px] px-3 py-2 rounded-lg border border-brand-navy/15"
              value={motionDraft.description}
              onChange={(e) => setMotionDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <label className="text-sm inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={motionDraft.must_vote}
              onChange={(e) => setMotionDraft((d) => ({ ...d, must_vote: e.target.checked }))}
            />
            MUST vote
          </label>
          <div className="flex flex-wrap gap-2">
            {!openMotion ? (
              <button
                type="button"
                disabled={pending}
                onClick={createMotion}
                className="px-4 py-2 rounded-lg bg-brand-gold text-brand-navy text-sm font-medium"
              >
                Create and open motion
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={saveMotionEdits}
                  className="px-4 py-2 rounded-lg border border-brand-navy/20 text-sm font-medium"
                >
                  Save edits
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={closeMotion}
                  className="px-4 py-2 rounded-lg border border-red-400/40 text-red-700 text-sm font-medium"
                >
                  Close motion
                </button>
              </>
            )}
          </div>
          <div className="text-xs text-brand-muted">
            Tally: Yes {motionTally.yes} | No {motionTally.no} | Abstain {motionTally.abstain} | Total{" "}
            {motionTally.total}
          </div>
        </div>

        <div className="rounded-xl border border-brand-navy/10 p-3 bg-white/50">
          <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Audit timeline</p>
          {motionAudit.length === 0 ? (
            <p className="text-sm text-brand-muted">No audit events yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {motionAudit.map((e) => (
                <li key={e.id} className="text-brand-navy/90">
                  <span className="capitalize font-medium">{e.event_type}</span>{" "}
                  <span className="text-brand-muted">({new Date(e.created_at).toLocaleString()})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-brand-navy/10 p-3 bg-white/50">
          <p className="text-xs uppercase tracking-wider text-brand-muted mb-2">Recent motions</p>
          <ul className="space-y-2 text-sm">
            {recentMotions.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {m.title || "Untitled"}{" "}
                  <span className="text-brand-muted">({m.closed_at ? "closed" : "open"})</span>
                </span>
                {m.closed_at ? (
                  <button
                    type="button"
                    disabled={pending || !!openMotion}
                    onClick={() => reopenMotion(m.id)}
                    className="text-xs text-brand-gold hover:underline disabled:opacity-50"
                  >
                    Reopen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

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
            className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium hover:opacity-90"
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
