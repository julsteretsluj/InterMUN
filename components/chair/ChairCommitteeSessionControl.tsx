"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type ProcedureRow = {
  state: string;
  current_vote_item_id: string | null;
  debate_closed: boolean;
  motion_floor_open: boolean;
  committee_session_started_at: string | null;
};

export function ChairCommitteeSessionControl({
  conferenceId,
  initialStartedAt,
}: {
  conferenceId: string;
  initialStartedAt: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("procedure_states")
      .select("committee_session_started_at")
      .eq("conference_id", conferenceId)
      .maybeSingle();
    setStartedAt((data as { committee_session_started_at?: string | null } | null)?.committee_session_started_at ?? null);
  }, [supabase, conferenceId]);

  useEffect(() => {
    setStartedAt(initialStartedAt);
  }, [initialStartedAt]);

  useEffect(() => {
    const ch = supabase
      .channel(`committee-session-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, refresh]);

  async function loadFullRow(): Promise<ProcedureRow | null> {
    const { data, error } = await supabase
      .from("procedure_states")
      .select("state, current_vote_item_id, debate_closed, motion_floor_open, committee_session_started_at")
      .eq("conference_id", conferenceId)
      .maybeSingle();
    if (error || !data) return null;
    return data as ProcedureRow;
  }

  function startSession() {
    setMsg(null);
    startTransition(async () => {
      const row = await loadFullRow();
      const now = new Date().toISOString();
      if (row) {
        const { error } = await supabase
          .from("procedure_states")
          .update({
            committee_session_started_at: now,
            updated_at: now,
          })
          .eq("conference_id", conferenceId);
        setMsg(error ? error.message : null);
      } else {
        const { error } = await supabase.from("procedure_states").insert({
          conference_id: conferenceId,
          state: "debate_open",
          debate_closed: false,
          motion_floor_open: false,
          committee_session_started_at: now,
          updated_at: now,
        });
        setMsg(error ? error.message : null);
      }
      void refresh();
    });
  }

  function stopSession() {
    setMsg(null);
    startTransition(async () => {
      const { error } = await supabase
        .from("procedure_states")
        .update({
          committee_session_started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", conferenceId);
      setMsg(error ? error.message : null);
      void refresh();
    });
  }

  const live = Boolean(startedAt);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-black/25 p-6 shadow-sm backdrop-blur-sm md:p-8">
        <h3 className="font-display text-lg font-semibold text-brand-navy md:text-xl">Committee session</h3>
        <p className="mt-1 text-sm text-brand-muted">Start or stop the committee session.</p>

        {live && startedAt ? (
          <p className="mt-4 text-sm font-medium text-brand-navy">
            Started:{" "}
            <time dateTime={startedAt}>{new Date(startedAt).toLocaleString()}</time>
          </p>
        ) : (
          <p className="mt-4 text-sm text-brand-muted">Session is not running.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {live ? (
            <button
              type="button"
              disabled={pending}
              onClick={stopSession}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-400/60 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-500/20 disabled:opacity-50 dark:border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-100 dark:hover:bg-rose-500/25"
            >
              <span aria-hidden>⏹️</span>
              Stop session
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={startSession}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-accent-ink hover:opacity-95 disabled:opacity-50"
            >
              <span aria-hidden>▶️</span>
              Start session
            </button>
          )}
        </div>

        {msg ? <p className="mt-3 text-sm text-rose-300">{msg}</p> : null}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-brand-muted">
        <span className="font-medium text-brand-navy/90">Session tools</span>
        <span className="mx-2 text-brand-muted">·</span>
        <Link href="/chair/session/motions" className="text-brand-gold-bright hover:underline">
          Motions
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/chair/session/timer" className="text-brand-gold-bright hover:underline">
          Timer
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/chair/session/speakers" className="text-brand-gold-bright hover:underline">
          Speakers
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/chair/session/roll-call" className="text-brand-gold-bright hover:underline">
          Roll call
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/chair/session/announcements" className="text-brand-gold-bright hover:underline">
          Announcements
        </Link>
      </div>
    </div>
  );
}
