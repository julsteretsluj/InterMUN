"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VoteType } from "@/types/database";
import {
  didMotionPass,
  motionRequiresClauseTargets,
} from "@/lib/resolution-functions";
import { recordClauseVoteOutcomesAction } from "@/app/actions/resolutions";
import { sortAllocationsByDisplayCountry } from "@/lib/allocation-display-order";

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
  procedure_code: string | null;
  procedure_resolution_id: string | null;
  procedure_clause_ids: string[];
  title: string | null;
  description: string | null;
  must_vote: boolean;
  required_majority: string;
  motioner_allocation_id: string | null;
  closed_at: string | null;
};
type MotionAudit = {
  id: string;
  event_type: "created" | "edited" | "opened" | "closed";
  created_at: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
};
type VoteCountRow = { value: "yes" | "no" };
type ResolutionRow = { id: string; google_docs_url: string | null };
type ClauseRow = {
  id: string;
  resolution_id: string;
  clause_number: number;
  clause_text: string;
};

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
  const [motionTally, setMotionTally] = useState({ yes: 0, no: 0, total: 0 });
  const [motionDraft, setMotionDraft] = useState({
    vote_type: "motion" as VoteType,
    procedure_code: null as string | null,
    title: "",
    description: "",
    must_vote: false,
    required_majority: "simple",
    procedure_resolution_id: null as string | null,
    procedure_clause_ids: [] as string[],
    motioner_allocation_id: null as string | null,
  });
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [resolutionClauses, setResolutionClauses] = useState<ClauseRow[]>([]);

  const procedurePresets = useMemo(
    () => [
      { code: null as string | null, label: "Custom" },
      { code: "set_agenda", label: "Motion to Set the Agenda", title: "Motion to Set the Agenda", majority: "simple" },
      { code: "extend_opening_speech", label: "Motion to Extend Opening Speech Time", title: "Motion to Extend Opening Speech Time", majority: "simple" },
      { code: "open_debate", label: "Motion to Open Debate", title: "Motion to Open Debate", majority: "simple" },
      { code: "close_debate", label: "Motion to Close Debate", title: "Motion to Close Debate", majority: "simple" },
      { code: "exclude_public", label: "Motion to Exclude the Public", title: "Motion to Exclude the Public", majority: "simple" },
      { code: "silent_prayer", label: "Minute of Silent Prayer/Meditation", title: "Motion for a Minute of Silent Prayer or Meditation", majority: "simple" },
      { code: "roll_call_vote", label: "Motion for a Roll Call Vote", title: "Motion for a Roll Call Vote", majority: "simple" },
      { code: "minute_silent", label: "Minute of Silent Prayer", title: "Motion for a Minute of Silent Prayer or Meditation", majority: "simple" },
      { code: "unmoderated_caucus", label: "Unmoderated Caucus", title: "Motion for an Unmoderated Caucus", majority: "simple" },
      { code: "moderated_caucus", label: "Moderated Caucus", title: "Motion for a Moderated Caucus", majority: "simple" },
      { code: "consultation", label: "Consultation", title: "Motion for a Consultation", majority: "simple" },
      { code: "adjourn", label: "Adjourn Session", title: "Motion to Adjourn Session", majority: "simple" },
      { code: "suspend", label: "Suspend Session", title: "Motion to Suspend Session", majority: "simple" },
      { code: "divide_question", label: "Divide the Question (editor needed)", title: "Motion to Divide the Question", majority: "simple" },
      { code: "clause_by_clause", label: "Clause-by-Clause (editor needed)", title: "Motion to Vote Clause by Clause", majority: "simple" },
      { code: "amendment", label: "Amendments (editor needed)", title: "Amendment", majority: "simple" },
    ],
    []
  );

  const selectedResolutionClauses = useMemo(() => {
    if (!motionDraft.procedure_resolution_id) return [];
    return resolutionClauses.filter((c) => c.resolution_id === motionDraft.procedure_resolution_id);
  }, [motionDraft.procedure_resolution_id, resolutionClauses]);

  const refresh = useCallback(async () => {
    const [
      { data: allocs },
      { data: q },
      { data: r },
      { data: ann },
      { data: t },
      { data: currentMotion },
      { data: motionRows },
      { data: resolutionRows },
      { data: clauseRows },
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
          .select(
            "id, conference_id, vote_type, procedure_code, procedure_resolution_id, procedure_clause_ids, title, description, must_vote, required_majority, motioner_allocation_id, closed_at"
          )
          .eq("conference_id", conferenceId)
          .is("closed_at", null)
          .maybeSingle(),
        supabase
          .from("vote_items")
          .select(
            "id, conference_id, vote_type, procedure_code, procedure_resolution_id, procedure_clause_ids, title, description, must_vote, required_majority, motioner_allocation_id, closed_at"
          )
          .eq("conference_id", conferenceId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("resolutions")
          .select("id, google_docs_url")
          .eq("conference_id", conferenceId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("resolution_clauses")
          .select("id, resolution_id, clause_number, clause_text")
          .eq("conference_id", conferenceId)
          .order("clause_number", { ascending: true })
          .limit(500),
      ]);

    setAllocations(sortAllocationsByDisplayCountry((allocs as Alloc[]) ?? []));
    setQueue((q as QueueRow[]) ?? []);
    setRoll((r as RollRow[]) ?? []);
    setAnnouncements((ann as Announcement[]) ?? []);
    const open = (currentMotion as MotionRow | null) ?? null;
    setOpenMotion(open);
    setRecentMotions((motionRows as MotionRow[]) ?? []);
    setResolutions((resolutionRows as ResolutionRow[]) ?? []);
    setResolutionClauses((clauseRows as ClauseRow[]) ?? []);
    if (open) {
      setMotionDraft({
        vote_type: open.vote_type,
        procedure_code: open.procedure_code,
        title: open.title ?? "",
        description: open.description ?? "",
        must_vote: open.must_vote,
        required_majority: open.required_majority,
        procedure_resolution_id: open.procedure_resolution_id,
        procedure_clause_ids: open.procedure_clause_ids ?? [],
        motioner_allocation_id: open.motioner_allocation_id ?? null,
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
      setMotionTally({ yes, no, total: rows.length });
      setMotionAudit((auditRows as MotionAudit[]) ?? []);
    } else {
      setMotionTally({ yes: 0, no: 0, total: 0 });
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
    if (
      motionRequiresClauseTargets(motionDraft.procedure_code) &&
      (!motionDraft.procedure_resolution_id || motionDraft.procedure_clause_ids.length === 0)
    ) {
      setMsg("Select a resolution and at least one clause for this procedural motion.");
      return;
    }
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;

      const { data: inserted, error } = await supabase
        .from("vote_items")
        .insert({
        conference_id: conferenceId,
        vote_type: motionDraft.vote_type,
          procedure_code: motionDraft.procedure_code,
          procedure_resolution_id: motionDraft.procedure_resolution_id,
          procedure_clause_ids: motionDraft.procedure_clause_ids,
        title: motionDraft.title.trim(),
        description: motionDraft.description.trim() || null,
        must_vote: motionDraft.must_vote,
        required_majority: motionDraft.required_majority,
        motioner_allocation_id: motionDraft.motioner_allocation_id || null,
        })
        .select("id")
        .maybeSingle();

      setMsg(error ? error.message : "Motion created and opened.");
      if (!error && inserted?.id) {
        await supabase.from("procedure_states").upsert({
          conference_id: conferenceId,
          state: "voting_procedure",
          current_vote_item_id: inserted.id,
          debate_closed: debateClosed,
          updated_at: new Date().toISOString(),
        });
        setMotionDraft({
          vote_type: "motion",
          procedure_code: null,
          title: "",
          description: "",
          must_vote: false,
          required_majority: "simple",
          procedure_resolution_id: null,
          procedure_clause_ids: [],
          motioner_allocation_id: null,
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
          procedure_code: motionDraft.procedure_code,
          procedure_resolution_id: motionDraft.procedure_resolution_id,
          procedure_clause_ids: motionDraft.procedure_clause_ids,
          title: motionDraft.title.trim() || null,
          description: motionDraft.description.trim() || null,
          must_vote: motionDraft.must_vote,
          required_majority: motionDraft.required_majority,
          motioner_allocation_id: motionDraft.motioner_allocation_id || null,
        })
        .eq("id", openMotion.id);
      setMsg(error ? error.message : "Motion updated.");
      void refresh();
    });
  }

  function closeMotion() {
    if (!openMotion) return;
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;

      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", openMotion.id);
      setMsg(error ? error.message : "Motion closed.");
      if (!error) {
        const passes = didMotionPass(
          openMotion.required_majority,
          motionTally.yes,
          motionTally.total
        );

        const hasClauseTargets =
          !!openMotion.procedure_resolution_id &&
          Array.isArray(openMotion.procedure_clause_ids) &&
          openMotion.procedure_clause_ids.length > 0;
        if (hasClauseTargets) {
          const outcomeResult = await recordClauseVoteOutcomesAction({
            voteItemId: openMotion.id,
            resolutionId: openMotion.procedure_resolution_id as string,
            clauseIds: openMotion.procedure_clause_ids,
            passed: passes,
            removeClauseTargetsOnFail: true,
            procedureCode: openMotion.procedure_code,
          });
          if (!outcomeResult.ok) {
            setMsg(outcomeResult.error);
            void refresh();
            return;
          }
        }

        let nextDebateClosed = debateClosed;
        if (openMotion.procedure_code === "close_debate") {
          nextDebateClosed = passes;
        }
        if (openMotion.procedure_code === "open_debate") {
          // Allow chairs to return to debate if explicitly reopened.
          nextDebateClosed = !passes ? debateClosed : false;
        }

        const nextState = nextDebateClosed ? "voting_procedure" : "debate_open";
        await supabase.from("procedure_states").upsert({
          conference_id: conferenceId,
          state: nextState,
          current_vote_item_id: null,
          debate_closed: nextDebateClosed,
          updated_at: new Date().toISOString(),
        });
      }
      void refresh();
    });
  }

  function reopenMotion(voteItemId: string) {
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;

      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: null })
        .eq("id", voteItemId);
      setMsg(error ? error.message : "Motion reopened.");
      if (!error) {
        await supabase.from("procedure_states").upsert({
          conference_id: conferenceId,
          state: "voting_procedure",
          current_vote_item_id: voteItemId,
          debate_closed: debateClosed,
          updated_at: new Date().toISOString(),
        });
      }
      void refresh();
    });
  }

  // Body uses light ink; panels are light cards — force dark text and visible field chrome.
  const surfaceCard =
    "rounded-xl border border-neutral-300 bg-white text-neutral-900 shadow-sm p-3";
  const surfaceLabel = "text-neutral-600 text-xs uppercase font-medium tracking-wide";
  const surfaceInputCore =
    "w-full px-3 py-2 rounded-lg border border-neutral-400 bg-white text-neutral-950 placeholder:text-neutral-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold";
  const surfaceField = `mt-1 ${surfaceInputCore}`;
  const surfaceFieldSm =
    "px-2 py-2 rounded-lg border border-neutral-400 bg-white text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/40";
  const surfaceSubpanel = "space-y-3 rounded-lg border border-neutral-300 p-3 bg-neutral-50 text-neutral-900";
  const surfaceInset =
    "max-h-36 overflow-y-auto rounded border border-neutral-300 p-2 bg-white space-y-1 text-neutral-950 text-xs";

  return (
    <div className="space-y-10 max-w-3xl">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      {msg && (
        <p className="text-sm text-neutral-900 bg-white border border-neutral-300 rounded-lg px-3 py-2 shadow-sm">
          {msg}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Motion control</h3>
        <p className="text-xs text-brand-muted">
          Chair-only: one open motion at a time. Delegates vote while motion is open.
        </p>
        <div className={`${surfaceCard} space-y-3`}>
          <label className="text-sm text-neutral-900">
            <span className={surfaceLabel}>Procedure preset</span>
            <select
              className={surfaceField}
              value={motionDraft.procedure_code ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const code = raw === "" ? null : raw;
                const preset = procedurePresets.find((p) => p.code === code);
                setMotionDraft((d) => ({
                  ...d,
                  procedure_code: code,
                  vote_type: "motion",
                  title: preset?.title ?? d.title,
                  required_majority: (preset?.majority as string | undefined) ?? d.required_majority,
                }));
              }}
            >
              {procedurePresets.map((p) => (
                <option key={String(p.code ?? "custom")} value={p.code ?? ""}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {(motionDraft.procedure_code === "divide_question" ||
            motionDraft.procedure_code === "clause_by_clause" ||
            motionDraft.procedure_code === "amendment") ? (
            <div className={surfaceSubpanel}>
              <label className="text-sm block">
                <span className={surfaceLabel}>Target resolution</span>
                <select
                  className={surfaceField}
                  value={motionDraft.procedure_resolution_id ?? ""}
                  onChange={(e) =>
                    setMotionDraft((d) => ({
                      ...d,
                      procedure_resolution_id: e.target.value || null,
                      procedure_clause_ids: [],
                    }))
                  }
                >
                  <option value="">Select resolution…</option>
                  {resolutions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.google_docs_url ? `Resolution ${r.id.slice(0, 8)} (${r.google_docs_url})` : `Resolution ${r.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1">
                <p className={surfaceLabel}>Target clauses</p>
                <div className={surfaceInset}>
                  {selectedResolutionClauses.length === 0 ? (
                    <p className="text-xs text-neutral-600">No clauses found for selected resolution.</p>
                  ) : (
                    selectedResolutionClauses.map((c) => {
                      const checked = motionDraft.procedure_clause_ids.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-start gap-2 text-xs cursor-pointer text-neutral-900">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setMotionDraft((d) => {
                                if (e.target.checked) {
                                  return { ...d, procedure_clause_ids: [...d.procedure_clause_ids, c.id] };
                                }
                                return {
                                  ...d,
                                  procedure_clause_ids: d.procedure_clause_ids.filter((x) => x !== c.id),
                                };
                              });
                            }}
                          />
                          <span className="line-clamp-2">
                            Clause {c.clause_number}: {c.clause_text}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm text-neutral-900">
              <span className={surfaceLabel}>Type</span>
              <select
                className={surfaceField}
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
            <label className="text-sm text-neutral-900">
              <span className={surfaceLabel}>Required majority</span>
              <select
                className={surfaceField}
                value={motionDraft.required_majority}
                onChange={(e) =>
                  setMotionDraft((d) => ({ ...d, required_majority: e.target.value }))
                }
              >
                <option value="simple">Simple</option>
                <option value="2/3">2/3</option>
              </select>
            </label>
          </div>
          <label className="text-sm block text-neutral-900">
            <span className={surfaceLabel}>Title</span>
            <input
              className={surfaceField}
              value={motionDraft.title}
              onChange={(e) => setMotionDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Motion title"
            />
          </label>
          <label className="text-sm block text-neutral-900">
            <span className={surfaceLabel}>Motioner</span>
            <select
              className={surfaceField}
              value={motionDraft.motioner_allocation_id ?? ""}
              onChange={(e) =>
                setMotionDraft((d) => ({
                  ...d,
                  motioner_allocation_id: e.target.value || null,
                }))
              }
            >
              <option value="">Not specified</option>
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.country}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block text-neutral-900">
            <span className={surfaceLabel}>Description</span>
            <textarea
              className={`${surfaceInputCore} mt-1 min-h-[72px]`}
              value={motionDraft.description}
              onChange={(e) => setMotionDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <label className="text-sm inline-flex items-center gap-2 text-neutral-900">
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
                  className="px-4 py-2 rounded-lg border border-neutral-500 bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
                >
                  Save edits
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={closeMotion}
                  className="px-4 py-2 rounded-lg border border-red-600 bg-red-50 text-red-900 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  Close motion
                </button>
              </>
            )}
          </div>
          <div className="text-xs text-neutral-700 font-medium">
            Tally: Yes {motionTally.yes} | No {motionTally.no} | Total {motionTally.total}
          </div>
        </div>

        <div className={surfaceCard}>
          <p className={`${surfaceLabel} mb-2 tracking-wider`}>Audit timeline</p>
          {motionAudit.length === 0 ? (
            <p className="text-sm text-neutral-600">No audit events yet.</p>
          ) : (
            <ul className="space-y-1 text-sm text-neutral-900">
              {motionAudit.map((e) => (
                <li key={e.id}>
                  <span className="capitalize font-medium">{e.event_type}</span>{" "}
                  <span className="text-neutral-600">({new Date(e.created_at).toLocaleString()})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={surfaceCard}>
          <p className={`${surfaceLabel} mb-2 tracking-wider`}>Recent motions</p>
          <ul className="space-y-2 text-sm text-neutral-900">
            {recentMotions.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {m.title || "Untitled"}{" "}
                  <span className="text-neutral-600">({m.closed_at ? "closed" : "open"})</span>
                </span>
                {m.closed_at ? (
                  <button
                    type="button"
                    disabled={pending || !!openMotion}
                    onClick={() => reopenMotion(m.id)}
                    className="text-xs text-amber-700 font-medium hover:underline disabled:opacity-50"
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
        <div className={`${surfaceCard} space-y-3`}>
          <p className="text-sm text-neutral-600">
            Delegates see this in the header when you save. Times are minutes and seconds.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm text-neutral-900">
              <span className={surfaceLabel}>Current speaker</span>
              <input
                className={surfaceField}
                value={timer.current}
                onChange={(e) => setTimer((t) => ({ ...t, current: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-neutral-900">
              <span className={surfaceLabel}>Next speaker</span>
              <input
                className={surfaceField}
                value={timer.next}
                onChange={(e) => setTimer((t) => ({ ...t, next: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <label className="text-sm text-neutral-900">
              <span className={surfaceLabel}>Time left</span>
              <div className="flex gap-1 mt-1 items-center">
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.leftM}
                  onChange={(e) => setTimer((t) => ({ ...t, leftM: e.target.value }))}
                />
                <span className="py-2 text-neutral-600 text-sm">m</span>
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.leftS}
                  onChange={(e) => setTimer((t) => ({ ...t, leftS: e.target.value }))}
                />
                <span className="py-2 text-neutral-600 text-sm">s</span>
              </div>
            </label>
            <label className="text-sm text-neutral-900">
              <span className={surfaceLabel}>Total</span>
              <div className="flex gap-1 mt-1 items-center">
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.totalM}
                  onChange={(e) => setTimer((t) => ({ ...t, totalM: e.target.value }))}
                />
                <span className="py-2 text-neutral-600 text-sm">m</span>
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.totalS}
                  onChange={(e) => setTimer((t) => ({ ...t, totalS: e.target.value }))}
                />
                <span className="py-2 text-neutral-600 text-sm">s</span>
              </div>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={saveTimer}
              className="px-4 py-2 rounded-lg bg-brand-gold text-brand-navy text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Save timer
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Dais announcements</h3>
        <div className={`${surfaceCard} space-y-3`}>
          <label className="block text-sm text-neutral-900">
            <span className={surfaceLabel}>Message</span>
            <textarea
              className={`${surfaceInputCore} mt-1 min-h-[80px]`}
              placeholder="Message to the committee…"
              value={daisBody}
              onChange={(e) => setDaisBody(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={postDais}
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-navy text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Post
          </button>
          <ul className="text-sm space-y-1 border-t border-neutral-200 pt-3 text-neutral-800">
            {announcements.map((a) => (
              <li key={a.id}>
                {a.body}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Speakers queue</h3>
        <div className={`${surfaceCard} space-y-3`}>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm flex-1 min-w-[12rem] text-neutral-900">
              <span className={surfaceLabel}>Add allocation</span>
              <select
                className={surfaceField}
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
              className="px-4 py-2 rounded-lg border border-neutral-500 bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2 text-neutral-900">
            {queue.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-neutral-200"
              >
                <span className="font-medium">
                  {q.label || "—"}{" "}
                  <span className="text-xs font-normal text-neutral-600">({q.status})</span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-amber-700 font-medium hover:underline"
                    onClick={() => setCurrent(q.id)}
                  >
                    Current
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-700 font-medium hover:underline"
                    onClick={() => removeQueue(q.id)}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Roll call</h3>
        <div className={`${surfaceCard} space-y-3`}>
          <button
            type="button"
            disabled={pending}
            onClick={initRollCall}
            className="px-4 py-2 rounded-lg border border-neutral-500 bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            Initialize rows (all allocations)
          </button>
          <ul className="space-y-2 text-sm text-neutral-900">
            {roll.map((r) => {
              const emb = r.allocations;
              const row = Array.isArray(emb) ? emb[0] : emb;
              const country = row?.country ?? r.allocation_id.slice(0, 8);
              return (
                <li key={r.allocation_id} className="flex items-center justify-between gap-2">
                  <span>{country}</span>
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-800">
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
        </div>
      </section>
    </div>
  );
}
