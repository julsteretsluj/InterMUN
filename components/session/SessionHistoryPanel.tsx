"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type SessionHistoryRow = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
};

function formatRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const startText = start.toLocaleString();
  const endText = end ? end.toLocaleString() : "Ongoing";
  return `${startText} -> ${endText}`;
}

export function SessionHistoryPanel({ conferenceId }: { conferenceId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SessionHistoryRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canRename = role === "chair" || role === "smt" || role === "admin";
  const canDelete = role === "smt" || role === "admin";

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setRole(p?.role?.toString().trim().toLowerCase() ?? null);
    } else {
      setRole(null);
    }

    const { data, error: historyError } = await supabase
      .from("committee_session_history")
      .select("id, title, started_at, ended_at")
      .eq("conference_id", conferenceId)
      .order("started_at", { ascending: false });
    if (historyError) {
      setRows([]);
      setError(historyError.message);
      return;
    }
    setRows((data as SessionHistoryRow[]) ?? []);
    setError(null);
  }, [conferenceId, supabase]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`session-history-${conferenceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "committee_session_history", filter: `conference_id=eq.${conferenceId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conferenceId, load, supabase]);

  function renameSession(id: string, currentTitle: string) {
    if (!canRename) return;
    const next = window.prompt("Session name", currentTitle)?.trim();
    if (!next) return;
    startTransition(async () => {
      const { error: updateErr } = await supabase
        .from("committee_session_history")
        .update({ title: next, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateErr) setError(updateErr.message);
      void load();
    });
  }

  function deleteSession(id: string) {
    if (!canDelete) return;
    if (!window.confirm("Delete this session from history?")) return;
    startTransition(async () => {
      const { error: deleteErr } = await supabase.from("committee_session_history").delete().eq("id", id);
      if (deleteErr) setError(deleteErr.message);
      void load();
    });
  }

  return (
    <section className="rounded-2xl border border-white/15 bg-black/25 p-6 shadow-sm backdrop-blur-sm md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy md:text-xl">Session history</h3>
        <p className="text-xs text-brand-muted">{rows.length} saved</p>
      </div>
      <p className="mt-1 text-sm text-brand-muted">
        Chairs can rename entries. SMT/Admin can rename and delete entries.
      </p>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-brand-muted">No session history yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-brand-navy"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{row.title}</p>
                <div className="flex gap-2">
                  {canRename ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => renameSession(row.id, row.title)}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/15 disabled:opacity-50"
                    >
                      Rename
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => deleteSession(row.id)}
                      className="rounded-lg border border-rose-400/50 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-brand-muted">{formatRange(row.started_at, row.ended_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
