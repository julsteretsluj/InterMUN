"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ListOrdered, Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { VoteType } from "@/types/database";
import {
  didMotionPass,
  motionRequiresClauseTargets,
  motionRequiresResolutionOnly,
} from "@/lib/resolution-functions";
import { recordClauseVoteOutcomesAction } from "@/app/actions/resolutions";
import { sortAllocationsByDisplayCountry } from "@/lib/allocation-display-order";
import { ropRequiredMajority } from "@/lib/rop-required-majority";
import { formatVoteMajorityLabel } from "@/lib/format-vote-majority";
import {
  motionDisruptivenessScore,
  sortMotionsMostDisruptiveFirst,
} from "@/lib/motion-disruptiveness";
import { useConferenceTimer } from "@/lib/use-conference-timer";
import { BUILTIN_TIMER_PRESETS, presetToTimerFields } from "@/lib/timer-presets";
import { DaisAnnouncementBody } from "@/components/dais/DaisAnnouncementBody";
import { isoToDatetimeLocalValue } from "@/lib/datetime-local";
import {
  type RollAttendance,
  nextRollAttendance,
  parseRollAttendance,
  rollAttendanceRollLabel,
  rollAttendanceShortLabel,
} from "@/lib/roll-attendance";

type Alloc = { id: string; country: string; user_id: string | null };
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
  attendance: RollAttendance;
  allocations: { country: string } | { country: string }[] | null;
};
type Announcement = {
  id: string;
  body: string;
  created_at: string;
  body_format?: string | null;
  is_pinned?: boolean | null;
  publish_at?: string | null;
};
type PauseEvent = { id: string; reason: string; created_at: string };
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
  open_for_voting: boolean;
  created_at: string;
  closed_at: string | null;
};
type MotionAudit = {
  id: string;
  event_type: "created" | "edited" | "opened" | "closed";
  created_at: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
};
type VoteCountRow = { value: string; user_id: string };
type ResolutionRow = { id: string; google_docs_url: string | null };
type ClauseRow = {
  id: string;
  resolution_id: string;
  clause_number: number;
  clause_text: string;
};

/** Dashboard splits session tools across routes; committee room uses `"all"`. */
export type SessionFloorSection =
  | "motions"
  | "timer"
  | "announcements"
  | "speakers"
  | "roll-call"
  | "all";

function SessionFloorNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/chair/session"
      ? pathname === "/chair/session"
      : pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-brand-gold text-brand-navy" : "text-brand-navy hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}

export function SessionControlClient({
  conferenceId,
  conferenceTitle,
  activeSection = "all",
}: {
  conferenceId: string;
  conferenceTitle: string;
  /** Default `"all"` keeps a single scroll (e.g. committee room). */
  activeSection?: SessionFloorSection;
}) {
  const supabase = createClient();
  const [allocations, setAllocations] = useState<Alloc[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [roll, setRoll] = useState<RollRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [daisBody, setDaisBody] = useState("");
  const [daisFormat, setDaisFormat] = useState<"plain" | "markdown">("markdown");
  const [daisPublishAt, setDaisPublishAt] = useState("");
  const [daisEditingId, setDaisEditingId] = useState<string | null>(null);
  const [daisEditBody, setDaisEditBody] = useState("");
  const [daisEditFormat, setDaisEditFormat] = useState<"plain" | "markdown">("markdown");
  const [daisEditPublishAt, setDaisEditPublishAt] = useState("");
  const [pauseEvents, setPauseEvents] = useState<PauseEvent[]>([]);
  const [pauseReasonDraft, setPauseReasonDraft] = useState("");
  const [timer, setTimer] = useState({
    current: "",
    next: "",
    leftM: "5",
    leftS: "0",
    totalM: "5",
    totalS: "0",
    perSpeakerMode: false,
    isRunning: true,
    /** general_floor = vote_item_id null; motion_vote = bind to selected open-for-voting motion */
    purpose: "general_floor" as "general_floor" | "motion_vote",
    boundVoteItemId: "",
    /** Delegate-visible preset label (e.g. GSL 60s). */
    floorLabel: "",
  });
  const [openVotingMotions, setOpenVotingMotions] = useState<MotionRow[]>([]);
  const [pickAlloc, setPickAlloc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [openMotion, setOpenMotion] = useState<MotionRow | null>(null);
  const [recentMotions, setRecentMotions] = useState<MotionRow[]>([]);
  const [motionAudit, setMotionAudit] = useState<MotionAudit[]>([]);
  const [motionTally, setMotionTally] = useState({ yes: 0, no: 0, total: 0 });
  const [motionVoteByUser, setMotionVoteByUser] = useState<Record<string, "yes" | "no">>({});
  const [motionDraft, setMotionDraft] = useState({
    vote_type: "motion" as VoteType,
    procedure_code: null as string | null,
    title: "",
    description: "",
    must_vote: false,
    procedure_resolution_id: null as string | null,
    procedure_clause_ids: [] as string[],
    motioner_allocation_id: null as string | null,
  });
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [resolutionClauses, setResolutionClauses] = useState<ClauseRow[]>([]);
  const [showModeratedCaucusQueuePrompt, setShowModeratedCaucusQueuePrompt] = useState(false);
  const [caucusBulkPick, setCaucusBulkPick] = useState<string[]>([]);
  const speakersSectionRef = useRef<HTMLElement | null>(null);
  const [motionFloorOpen, setMotionFloorOpen] = useState(false);
  const [pendingStatedMotions, setPendingStatedMotions] = useState<MotionRow[]>([]);
  /** Linear roll-call index into `sortAllocationsByDisplayCountry(allocations)` while recording votes. */
  const [voteCallIndex, setVoteCallIndex] = useState(0);

  const { timer: liveTimerRow, remaining: liveRemaining } = useConferenceTimer(
    conferenceId,
    openMotion?.id ?? null,
    true
  );

  useEffect(() => {
    if (timer.purpose !== "motion_vote") return;
    if (timer.boundVoteItemId.trim()) return;
    if (openVotingMotions.length !== 1) return;
    const onlyId = openVotingMotions[0]!.id;
    setTimer((t) => (t.boundVoteItemId === "" ? { ...t, boundVoteItemId: onlyId } : t));
  }, [timer.purpose, timer.boundVoteItemId, openVotingMotions]);

  useEffect(() => {
    setVoteCallIndex(0);
  }, [openMotion?.id]);

  const votingCallOrder = useMemo(
    () => sortAllocationsByDisplayCountry(allocations),
    [allocations]
  );

  const rollAttendanceByAllocationId = useMemo(() => {
    const m = new Map<string, RollAttendance>();
    for (const r of roll) {
      m.set(r.allocation_id, r.attendance);
    }
    return m;
  }, [roll]);

  useEffect(() => {
    setVoteCallIndex((i) => Math.min(i, votingCallOrder.length));
  }, [votingCallOrder.length]);

  const procedurePresets = useMemo(
    () => [
      { code: null as string | null, label: "Custom" },
      { code: "set_agenda", label: "Motion to Set the Agenda", title: "Motion to Set the Agenda" },
      { code: "extend_opening_speech", label: "Motion to Extend Opening Speech Time", title: "Motion to Extend Opening Speech Time" },
      { code: "open_debate", label: "Motion to Open Debate", title: "Motion to Open Debate" },
      {
        code: "for_against_speeches",
        label: "Motion to Begin For/Against Speeches (resolution)",
        title: "Motion to Begin For and Against Speeches on the Draft Resolution",
      },
      { code: "close_debate", label: "Motion to Close Debate", title: "Motion to Close Debate" },
      { code: "exclude_public", label: "Motion to Exclude the Public", title: "Motion to Exclude the Public" },
      { code: "silent_prayer", label: "Minute of Silent Prayer/Meditation", title: "Motion for a Minute of Silent Prayer or Meditation" },
      { code: "roll_call_vote", label: "Motion for a Roll Call Vote", title: "Motion for a Roll Call Vote" },
      { code: "minute_silent", label: "Minute of Silent Prayer", title: "Motion for a Minute of Silent Prayer or Meditation" },
      { code: "unmoderated_caucus", label: "Unmoderated Caucus", title: "Motion for an Unmoderated Caucus" },
      { code: "moderated_caucus", label: "Moderated Caucus", title: "Motion for a Moderated Caucus" },
      { code: "consultation", label: "Consultation", title: "Motion for a Consultation" },
      { code: "adjourn", label: "Adjourn Session", title: "Motion to Adjourn Session" },
      { code: "suspend", label: "Suspend Session", title: "Motion to Suspend Session" },
      { code: "divide_question", label: "Divide the Question (editor needed)", title: "Motion to Divide the Question" },
      { code: "clause_by_clause", label: "Clause-by-Clause (editor needed)", title: "Motion to Vote Clause by Clause" },
      { code: "amendment", label: "Amendments (editor needed)", title: "Amendment" },
    ],
    []
  );

  const ropMajorityForDraft = useMemo(
    () => ropRequiredMajority(motionDraft.vote_type, motionDraft.procedure_code),
    [motionDraft.vote_type, motionDraft.procedure_code]
  );

  const selectedResolutionClauses = useMemo(() => {
    if (!motionDraft.procedure_resolution_id) return [];
    return resolutionClauses.filter((c) => c.resolution_id === motionDraft.procedure_resolution_id);
  }, [motionDraft.procedure_resolution_id, resolutionClauses]);

  const activeQueueAllocationIds = useMemo(() => {
    const s = new Set<string>();
    for (const row of queue) {
      if (
        (row.status === "waiting" || row.status === "current") &&
        row.allocation_id
      ) {
        s.add(row.allocation_id);
      }
    }
    return s;
  }, [queue]);

  useEffect(() => {
    if (!showModeratedCaucusQueuePrompt) return;
    const id = requestAnimationFrame(() => {
      speakersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [showModeratedCaucusQueuePrompt]);

  const refresh = useCallback(async () => {
    const motionSelect =
      "id, conference_id, vote_type, procedure_code, procedure_resolution_id, procedure_clause_ids, title, description, must_vote, required_majority, motioner_allocation_id, open_for_voting, created_at, closed_at";

    const [
      { data: psRow },
      { data: allocs },
      { data: q },
      { data: r },
      { data: ann },
      { data: t },
      { data: unclosedRows },
      { data: recentClosedRows },
      { data: resolutionRows },
      { data: clauseRows },
      { data: pauseRows },
    ] =
      await Promise.all([
        supabase
          .from("procedure_states")
          .select("state, current_vote_item_id, debate_closed, motion_floor_open")
          .eq("conference_id", conferenceId)
          .maybeSingle(),
        supabase
          .from("allocations")
          .select("id, country, user_id")
          .eq("conference_id", conferenceId)
          .order("country"),
        supabase
          .from("speaker_queue_entries")
          .select("id, sort_order, label, status, allocation_id")
          .eq("conference_id", conferenceId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("roll_call_entries")
          .select("allocation_id, present, attendance, allocations(country)")
          .eq("conference_id", conferenceId)
          .order("allocation_id"),
        supabase
          .from("dais_announcements")
          .select("id, body, created_at, body_format, is_pinned, publish_at")
          .eq("conference_id", conferenceId)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(24),
        supabase.from("timers").select("*").eq("conference_id", conferenceId).maybeSingle(),
        supabase.from("vote_items").select(motionSelect).eq("conference_id", conferenceId).is("closed_at", null),
        supabase
          .from("vote_items")
          .select(motionSelect)
          .eq("conference_id", conferenceId)
          .not("closed_at", "is", null)
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
        supabase
          .from("timer_pause_events")
          .select("id, reason, created_at")
          .eq("conference_id", conferenceId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    setAllocations(sortAllocationsByDisplayCountry((allocs as Alloc[]) ?? []));
    setQueue((q as QueueRow[]) ?? []);
    setRoll(
      ((r as (Omit<RollRow, "attendance"> & { attendance?: string | null })[]) ?? []).map(
        (row) =>
          ({
            ...row,
            attendance:
              parseRollAttendance(row.attendance) ??
              (row.present === true ? "present_voting" : "absent"),
          }) satisfies RollRow
      )
    );
    setAnnouncements((ann as Announcement[]) ?? []);
    setPauseEvents((pauseRows as PauseEvent[]) ?? []);
    const ps = psRow as {
      motion_floor_open?: boolean;
      debate_closed?: boolean;
      state?: string;
      current_vote_item_id?: string | null;
    } | null;
    setMotionFloorOpen(!!ps?.motion_floor_open);

    const unclosed = (unclosedRows as MotionRow[]) ?? [];
    const openForVotingList = unclosed.filter((row) => row.open_for_voting === true);
    setOpenVotingMotions(openForVotingList);
    const open = openForVotingList[0] ?? null;
    const pendingRaw = unclosed.filter((row) => row.open_for_voting === false);
    setPendingStatedMotions(sortMotionsMostDisruptiveFirst(pendingRaw));
    setOpenMotion(open);
    setRecentMotions((recentClosedRows as MotionRow[]) ?? []);
    setResolutions((resolutionRows as ResolutionRow[]) ?? []);
    setResolutionClauses((clauseRows as ClauseRow[]) ?? []);
    if (open) {
      setMotionDraft({
        vote_type: open.vote_type,
        procedure_code: open.procedure_code,
        title: open.title ?? "",
        description: open.description ?? "",
        must_vote: open.must_vote,
        procedure_resolution_id: open.procedure_resolution_id,
        procedure_clause_ids: open.procedure_clause_ids ?? [],
        motioner_allocation_id: open.motioner_allocation_id ?? null,
      });
    }

    const motionId = open?.id ?? null;
    if (motionId) {
      const [{ data: openVotes }, { data: auditRows }] = await Promise.all([
        supabase.from("votes").select("value, user_id").eq("vote_item_id", motionId),
        supabase
          .from("motion_audit_events")
          .select("id, event_type, created_at, actor_profile_id, metadata")
          .eq("vote_item_id", motionId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const rows = (openVotes ?? []) as VoteCountRow[];
      const counted = rows.filter((v) => v.value === "yes" || v.value === "no");
      const yes = counted.filter((v) => v.value === "yes").length;
      const no = counted.filter((v) => v.value === "no").length;
      setMotionTally({ yes, no, total: counted.length });
      const vm: Record<string, "yes" | "no"> = {};
      for (const r of counted) {
        vm[r.user_id] = r.value as "yes" | "no";
      }
      setMotionVoteByUser(vm);
      setMotionAudit((auditRows as MotionAudit[]) ?? []);
    } else {
      setMotionTally({ yes: 0, no: 0, total: 0 });
      setMotionVoteByUser({});
      setMotionAudit([]);
    }

    if (t) {
      const tl = t.time_left_seconds ?? 0;
      const tt = t.total_time_seconds ?? 0;
      const tr = t as {
        per_speaker_mode?: boolean | null;
        is_running?: boolean | null;
        vote_item_id?: string | null;
      };
      const vid = tr.vote_item_id ?? null;
      const floorLabel = (t as { floor_label?: string | null }).floor_label ?? "";
      setTimer({
        current: t.current_speaker ?? "",
        next: t.next_speaker ?? "",
        leftM: String(Math.floor(tl / 60)),
        leftS: String(tl % 60),
        totalM: String(Math.floor(tt / 60)),
        totalS: String(tt % 60),
        perSpeakerMode: !!tr.per_speaker_mode,
        isRunning: tr.is_running !== false,
        purpose: vid ? "motion_vote" : "general_floor",
        boundVoteItemId: vid ?? "",
        floorLabel: floorLabel.trim(),
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dais_announcements", filter: `conference_id=eq.${conferenceId}` },
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
    let voteItemIdToSave: string | null = null;
    if (timer.purpose === "motion_vote") {
      const id = timer.boundVoteItemId.trim();
      if (!id) {
        setMsg("Select which open motion this timer applies to.");
        return;
      }
      if (!openVotingMotions.some((m) => m.id === id)) {
        setMsg("That selection is not an open vote anymore. Choose again or use general floor.");
        return;
      }
      voteItemIdToSave = id;
    }

    startTransition(async () => {
      const left = parseTime(timer.leftM, timer.leftS);
      let total = parseTime(timer.totalM, timer.totalS);
      if (total <= 0) total = left > 0 ? left : 60;
      const { error } = await supabase.from("timers").upsert(
        {
          conference_id: conferenceId,
          current_speaker: timer.current.trim() || null,
          next_speaker: timer.next.trim() || null,
          time_left_seconds: left,
          total_time_seconds: total,
          vote_item_id: voteItemIdToSave,
          per_speaker_mode: timer.perSpeakerMode,
          is_running: timer.isRunning,
          floor_label: timer.floorLabel.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conference_id" }
      );
      setMsg(error ? error.message : "Timer saved.");
      void refresh();
    });
  }

  function stopFloorTimer() {
    if (!liveTimerRow) {
      setMsg("Save the timer once so there is a row to pause.");
      return;
    }
    if (!timer.isRunning) {
      setMsg("Timer is already paused.");
      return;
    }
    const frozenLeft = Math.max(0, Math.round(liveRemaining));
    const reason = pauseReasonDraft.trim() || "Paused by chair";
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: logErr } = await supabase.from("timer_pause_events").insert({
        conference_id: conferenceId,
        reason,
        created_by: user?.id ?? null,
      });
      if (logErr) {
        setMsg(logErr.message);
        return;
      }
      const { error } = await supabase
        .from("timers")
        .update({
          time_left_seconds: frozenLeft,
          is_running: false,
          current_pause_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", conferenceId);
      setMsg(error ? error.message : "Timer paused for the committee.");
      void refresh();
    });
  }

  function startFloorTimer() {
    if (!liveTimerRow) {
      setMsg("Save the timer once before starting the clock.");
      return;
    }
    if (timer.isRunning) {
      setMsg("Timer is already running.");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase
        .from("timers")
        .update({
          is_running: true,
          current_pause_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", conferenceId);
      setMsg(error ? error.message : "Timer running for the committee.");
      void refresh();
    });
  }

  function recordDelegateVoteForCall(value: "yes" | "no") {
    if (!openMotion) {
      setMsg("No motion open for voting.");
      return;
    }
    const current = votingCallOrder[voteCallIndex];
    if (!current) {
      setMsg("No delegate at this position in the call list.");
      return;
    }
    if (!current.user_id) {
      setMsg("This placard has no delegate account — use Skip (vacant / not seated).");
      return;
    }
    const orderLen = votingCallOrder.length;
    const uid = current.user_id;
    const voteItemId = openMotion.id;
    startTransition(async () => {
      const { error } = await supabase.from("votes").upsert(
        { vote_item_id: voteItemId, user_id: uid, value },
        { onConflict: "vote_item_id,user_id" }
      );
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg(null);
      setVoteCallIndex((i) => Math.min(i + 1, orderLen));
      void refresh();
    });
  }

  function skipDelegateVoteForCall() {
    if (!openMotion) {
      setMsg("No motion open for voting.");
      return;
    }
    const current = votingCallOrder[voteCallIndex];
    if (!current) return;
    const orderLen = votingCallOrder.length;
    const voteItemId = openMotion.id;
    startTransition(async () => {
      if (current.user_id) {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("vote_item_id", voteItemId)
          .eq("user_id", current.user_id);
        if (error) {
          setMsg(error.message);
          return;
        }
      }
      setMsg(null);
      setVoteCallIndex((i) => Math.min(i + 1, orderLen));
      void refresh();
    });
  }

  function advanceSpeakerAndResetClock() {
    if (!timer.perSpeakerMode) {
      setMsg("Turn on per-speaker time first, then save the timer.");
      return;
    }
    startTransition(async () => {
      const sorted = [...queue].sort((a, b) => a.sort_order - b.sort_order);
      const curIdx = sorted.findIndex((r) => r.status === "current");
      const currentRow = curIdx >= 0 ? sorted[curIdx] : null;
      const nextWaiting = sorted.find((r, i) => r.status === "waiting" && (!currentRow || i > curIdx));
      const firstWaiting = sorted.find((r) => r.status === "waiting");

      const nextCurrent = nextWaiting ?? firstWaiting;
      if (!nextCurrent) {
        setMsg("No waiting speakers in the queue to advance to.");
        return;
      }

      await supabase.from("speaker_queue_entries").update({ status: "waiting" }).eq("conference_id", conferenceId);
      if (currentRow) {
        await supabase.from("speaker_queue_entries").update({ status: "done" }).eq("id", currentRow.id);
      }
      await supabase.from("speaker_queue_entries").update({ status: "current" }).eq("id", nextCurrent.id);

      const nextIdx = sorted.indexOf(nextCurrent);
      const afterNext = sorted.slice(nextIdx + 1).find((r) => r.status === "waiting");
      const cap = Math.max(1, parseTime(timer.totalM, timer.totalS) || parseTime(timer.leftM, timer.leftS) || 60);
      const curLabel = nextCurrent.label?.trim() || "—";
      const nextLabel = afterNext?.label?.trim() || "";

      const voteItemIdToSave =
        timer.purpose === "motion_vote" && timer.boundVoteItemId.trim()
          ? timer.boundVoteItemId.trim()
          : null;

      const { error } = await supabase.from("timers").upsert(
        {
          conference_id: conferenceId,
          current_speaker: curLabel,
          next_speaker: nextLabel || null,
          time_left_seconds: cap,
          total_time_seconds: cap,
          vote_item_id: voteItemIdToSave,
          per_speaker_mode: true,
          is_running: true,
          floor_label: timer.floorLabel.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conference_id" }
      );

      setTimer((prev) => ({
        ...prev,
        current: curLabel,
        next: nextLabel,
        leftM: String(Math.floor(cap / 60)),
        leftS: String(cap % 60),
        totalM: String(Math.floor(cap / 60)),
        totalS: String(cap % 60),
        perSpeakerMode: true,
        isRunning: true,
        floorLabel: prev.floorLabel,
      }));
      setMsg(error ? error.message : "Advanced speaker and reset per-speaker clock.");
      void refresh();
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
      const publishAtIso = daisPublishAt.trim() ? new Date(daisPublishAt).toISOString() : null;
      const { error } = await supabase.from("dais_announcements").insert({
        conference_id: conferenceId,
        body,
        created_by: user.id,
        body_format: daisFormat,
        publish_at: publishAtIso,
        is_pinned: false,
      });
      if (!error) {
        setDaisBody("");
        setDaisPublishAt("");
      }
      setMsg(error ? error.message : "Announcement posted.");
      void refresh();
    });
  }

  function setDaisPinned(announcementId: string, pinned: boolean) {
    startTransition(async () => {
      if (pinned) {
        await supabase
          .from("dais_announcements")
          .update({ is_pinned: false })
          .eq("conference_id", conferenceId);
        const { error } = await supabase
          .from("dais_announcements")
          .update({ is_pinned: true })
          .eq("id", announcementId);
        setMsg(error ? error.message : "Pinned for the committee floor.");
      } else {
        const { error } = await supabase
          .from("dais_announcements")
          .update({ is_pinned: false })
          .eq("id", announcementId);
        setMsg(error ? error.message : "Unpinned.");
      }
      void refresh();
    });
  }

  function beginEditDais(a: Announcement) {
    setDaisEditingId(a.id);
    setDaisEditBody(a.body);
    setDaisEditFormat(a.body_format === "markdown" ? "markdown" : "plain");
    setDaisEditPublishAt(isoToDatetimeLocalValue(a.publish_at ?? null));
  }

  function cancelEditDais() {
    setDaisEditingId(null);
    setDaisEditBody("");
    setDaisEditPublishAt("");
  }

  function saveDaisEdit() {
    if (!daisEditingId) return;
    const body = daisEditBody.trim();
    if (!body) {
      setMsg("Announcement body cannot be empty.");
      return;
    }
    const publishAtIso = daisEditPublishAt.trim() ? new Date(daisEditPublishAt).toISOString() : null;
    startTransition(async () => {
      const { error } = await supabase
        .from("dais_announcements")
        .update({
          body,
          body_format: daisEditFormat,
          publish_at: publishAtIso,
        })
        .eq("id", daisEditingId)
        .eq("conference_id", conferenceId);
      if (!error) cancelEditDais();
      setMsg(error ? error.message : "Announcement updated.");
      void refresh();
    });
  }

  function deleteDaisAnnouncement(id: string) {
    if (
      !window.confirm("Delete this announcement permanently? This cannot be undone.")
    ) {
      return;
    }
    startTransition(async () => {
      if (daisEditingId === id) cancelEditDais();
      const { error } = await supabase.from("dais_announcements").delete().eq("id", id).eq("conference_id", conferenceId);
      setMsg(error ? error.message : "Announcement deleted.");
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

  function toggleCaucusBulkPick(allocationId: string) {
    setCaucusBulkPick((prev) =>
      prev.includes(allocationId) ? prev.filter((x) => x !== allocationId) : [...prev, allocationId]
    );
  }

  function addBulkModeratedCaucusSpeakers() {
    const toAdd = allocations
      .map((a) => a.id)
      .filter((id) => caucusBulkPick.includes(id) && !activeQueueAllocationIds.has(id));
    if (!toAdd.length) {
      setMsg("Choose allocations that are not already waiting or current in the queue.");
      return;
    }
    startTransition(async () => {
      const maxBase = queue.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const rows = toAdd.map((id, i) => {
        const a = allocations.find((x) => x.id === id);
        return {
          conference_id: conferenceId,
          allocation_id: id,
          label: a?.country ?? "—",
          sort_order: maxBase + 1 + i,
          status: "waiting" as const,
        };
      });
      const { error } = await supabase.from("speaker_queue_entries").insert(rows);
      setMsg(
        error
          ? error.message
          : `Added ${toAdd.length} speaker(s) to the queue for the moderated caucus.`
      );
      if (!error) setCaucusBulkPick([]);
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
        attendance: "absent" as const,
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

  function cycleRollAttendanceForRow(allocationId: string) {
    const row = roll.find((x) => x.allocation_id === allocationId);
    const current = row?.attendance ?? "absent";
    const next = nextRollAttendance(current);
    startTransition(async () => {
      await supabase
        .from("roll_call_entries")
        .update({ attendance: next, updated_at: new Date().toISOString() })
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
    if (motionFloorOpen) {
      setMsg(
        "The motion floor is open for statements. Close the floor and use Record stated motion, or close the floor first to create a single open vote."
      );
      return;
    }
    if (pendingStatedMotions.length > 0) {
      setMsg(
        "Stated motions are waiting to be voted. Use Begin voting (RoP order) or withdraw them before using Create and open motion."
      );
      return;
    }
    if (
      motionRequiresClauseTargets(motionDraft.procedure_code) &&
      (!motionDraft.procedure_resolution_id || motionDraft.procedure_clause_ids.length === 0)
    ) {
      setMsg("Select a resolution and at least one clause for this procedural motion.");
      return;
    }
    if (
      motionRequiresResolutionOnly(motionDraft.procedure_code) &&
      !motionDraft.procedure_resolution_id
    ) {
      setMsg("Select a resolution for this motion.");
      return;
    }
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;
      const motionFloor = psRow?.motion_floor_open ?? false;

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
        required_majority: ropRequiredMajority(motionDraft.vote_type, motionDraft.procedure_code),
        motioner_allocation_id: motionDraft.motioner_allocation_id || null,
        open_for_voting: true,
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
          motion_floor_open: motionFloor,
          updated_at: new Date().toISOString(),
        });
        setMotionDraft({
          vote_type: "motion",
          procedure_code: null,
          title: "",
          description: "",
          must_vote: false,
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
          required_majority: ropRequiredMajority(motionDraft.vote_type, motionDraft.procedure_code),
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
        .select("debate_closed, motion_floor_open")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;
      const motionFloor = psRow?.motion_floor_open ?? false;

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
          motion_floor_open: motionFloor,
          updated_at: new Date().toISOString(),
        });

        if (passes && openMotion.procedure_code === "moderated_caucus") {
          setCaucusBulkPick([]);
          setShowModeratedCaucusQueuePrompt(true);
        }
      }
      void refresh();
    });
  }

  function reopenMotion(voteItemId: string) {
    startTransition(async () => {
      const { data: blocking } = await supabase
        .from("vote_items")
        .select("id")
        .eq("conference_id", conferenceId)
        .is("closed_at", null)
        .eq("open_for_voting", true)
        .maybeSingle();
      if (blocking && blocking.id !== voteItemId) {
        setMsg("Another motion is already open for voting. Close it before reopening this one.");
        return;
      }

      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;
      const motionFloor = psRow?.motion_floor_open ?? false;

      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: null, open_for_voting: true })
        .eq("id", voteItemId);
      setMsg(error ? error.message : "Motion reopened.");
      if (!error) {
        await supabase.from("procedure_states").upsert({
          conference_id: conferenceId,
          state: "voting_procedure",
          current_vote_item_id: voteItemId,
          debate_closed: debateClosed,
          motion_floor_open: motionFloor,
          updated_at: new Date().toISOString(),
        });
      }
      void refresh();
    });
  }

  function openMotionFloorForStatements() {
    if (openMotion) {
      setMsg("Close the current vote before opening the motion floor for statements.");
      return;
    }
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const { error } = await supabase.from("procedure_states").upsert({
        conference_id: conferenceId,
        state: (psRow?.state as string) ?? "debate_open",
        current_vote_item_id: psRow?.current_vote_item_id ?? null,
        debate_closed: psRow?.debate_closed ?? false,
        motion_floor_open: true,
        updated_at: new Date().toISOString(),
      });
      setMsg(error ? error.message : "Motion floor open — record each stated motion below.");
      void refresh();
    });
  }

  function closeMotionFloorForStatements() {
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const { error } = await supabase.from("procedure_states").upsert({
        conference_id: conferenceId,
        state: (psRow?.state as string) ?? "debate_open",
        current_vote_item_id: psRow?.current_vote_item_id ?? null,
        debate_closed: psRow?.debate_closed ?? false,
        motion_floor_open: false,
        updated_at: new Date().toISOString(),
      });
      setMsg(error ? error.message : "Motion floor closed for statements.");
      void refresh();
    });
  }

  function recordStatedMotion() {
    if (!motionFloorOpen) {
      setMsg("Open the motion floor for statements first.");
      return;
    }
    if (openMotion) {
      setMsg("A motion is already open for voting. Close it before recording further statements.");
      return;
    }
    if (!motionDraft.title.trim()) {
      setMsg("Motion title is required.");
      return;
    }
    if (
      motionRequiresClauseTargets(motionDraft.procedure_code) &&
      (!motionDraft.procedure_resolution_id || motionDraft.procedure_clause_ids.length === 0)
    ) {
      setMsg("Select a resolution and at least one clause for this procedural motion.");
      return;
    }
    if (
      motionRequiresResolutionOnly(motionDraft.procedure_code) &&
      !motionDraft.procedure_resolution_id
    ) {
      setMsg("Select a resolution for this motion.");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase.from("vote_items").insert({
        conference_id: conferenceId,
        vote_type: motionDraft.vote_type,
        procedure_code: motionDraft.procedure_code,
        procedure_resolution_id: motionDraft.procedure_resolution_id,
        procedure_clause_ids: motionDraft.procedure_clause_ids,
        title: motionDraft.title.trim(),
        description: motionDraft.description.trim() || null,
        must_vote: motionDraft.must_vote,
        required_majority: ropRequiredMajority(motionDraft.vote_type, motionDraft.procedure_code),
        motioner_allocation_id: motionDraft.motioner_allocation_id || null,
        open_for_voting: false,
      });
      setMsg(error ? error.message : "Stated motion recorded (not yet open for voting).");
      if (!error) {
        setMotionDraft({
          vote_type: "motion",
          procedure_code: null,
          title: "",
          description: "",
          must_vote: false,
          procedure_resolution_id: null,
          procedure_clause_ids: [],
          motioner_allocation_id: null,
        });
      }
      void refresh();
    });
  }

  function beginVotingInDisruptivenessOrder() {
    if (motionFloorOpen) {
      setMsg("Close the motion floor for statements before beginning votes.");
      return;
    }
    if (openMotion) {
      setMsg("A motion is already open for voting.");
      return;
    }
    const ordered = sortMotionsMostDisruptiveFirst(pendingStatedMotions);
    if (!ordered.length) {
      setMsg("No stated motions are waiting to be voted on.");
      return;
    }
    const first = ordered[0];
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", conferenceId)
        .maybeSingle();
      const { error: uErr } = await supabase
        .from("vote_items")
        .update({ open_for_voting: true })
        .eq("id", first.id)
        .eq("open_for_voting", false);
      if (uErr) {
        setMsg(uErr.message);
        void refresh();
        return;
      }
      const { error: pErr } = await supabase.from("procedure_states").upsert({
        conference_id: conferenceId,
        state: "voting_procedure",
        current_vote_item_id: first.id,
        debate_closed: psRow?.debate_closed ?? false,
        motion_floor_open: false,
        updated_at: new Date().toISOString(),
      });
      setMsg(
        pErr
          ? pErr.message
          : `Opened for voting: ${first.title ?? "Motion"} (most disruptive of the pending set).`
      );
      void refresh();
    });
  }

  function withdrawStatedMotion(voteItemId: string) {
    startTransition(async () => {
      const { error } = await supabase
        .from("vote_items")
        .delete()
        .eq("id", voteItemId)
        .eq("conference_id", conferenceId)
        .eq("open_for_voting", false);
      setMsg(error ? error.message : "Stated motion removed.");
      void refresh();
    });
  }

  /** Deletes an open-for-voting or closed motion; pending stated motions use {@link withdrawStatedMotion}. */
  function deleteMotionAsChair(voteItemId: string) {
    startTransition(async () => {
      const { data: row, error: fetchErr } = await supabase
        .from("vote_items")
        .select("open_for_voting, closed_at")
        .eq("id", voteItemId)
        .eq("conference_id", conferenceId)
        .maybeSingle();

      if (fetchErr) {
        setMsg(fetchErr.message);
        void refresh();
        return;
      }
      if (!row) {
        setMsg("Motion not found.");
        void refresh();
        return;
      }

      const isPendingStated = row.closed_at === null && row.open_for_voting === false;
      if (isPendingStated) {
        setMsg("Remove pending stated motions with Withdraw in the list above.");
        void refresh();
        return;
      }

      const isLiveOpen = row.closed_at === null && row.open_for_voting === true;
      let psRow: {
        debate_closed?: boolean;
        motion_floor_open?: boolean;
        current_vote_item_id?: string | null;
      } | null = null;
      if (isLiveOpen) {
        const { data: ps } = await supabase
          .from("procedure_states")
          .select("debate_closed, motion_floor_open, current_vote_item_id")
          .eq("conference_id", conferenceId)
          .maybeSingle();
        psRow = ps;
      }

      const { error: delErr } = await supabase
        .from("vote_items")
        .delete()
        .eq("id", voteItemId)
        .eq("conference_id", conferenceId);

      if (delErr) {
        setMsg(delErr.message);
        void refresh();
        return;
      }

      if (isLiveOpen && psRow?.current_vote_item_id === voteItemId) {
        const { error: psErr } = await supabase.from("procedure_states").upsert({
          conference_id: conferenceId,
          state: psRow.debate_closed ? "voting_procedure" : "debate_open",
          current_vote_item_id: null,
          debate_closed: psRow.debate_closed ?? false,
          motion_floor_open: psRow.motion_floor_open ?? false,
          updated_at: new Date().toISOString(),
        });
        if (psErr) {
          setMsg(psErr.message);
          void refresh();
          return;
        }
      }

      setMsg("Motion deleted.");
      void refresh();
    });
  }

  const surfaceCard =
    "rounded-xl border border-white/15 bg-black/25 p-3 text-brand-navy shadow-sm backdrop-blur-sm";
  const surfaceLabel = "text-xs font-medium uppercase tracking-wide text-brand-muted";
  const surfaceInputCore =
    "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-brand-navy shadow-inner placeholder:text-brand-muted/60 focus:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/40";
  const surfaceField = `mt-1 ${surfaceInputCore}`;
  const surfaceFieldSm =
    "rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-brand-navy shadow-inner focus:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/40";
  const surfaceSubpanel = "space-y-3 rounded-lg border border-white/15 bg-black/20 p-3 text-brand-navy";
  const surfaceInset =
    "max-h-36 space-y-1 overflow-y-auto rounded border border-white/15 bg-black/30 p-2 text-xs text-brand-navy";

  const isSplitView = activeSection !== "all";
  const show = (id: Exclude<SessionFloorSection, "all">) =>
    activeSection === "all" || activeSection === id;

  return (
    <div className="space-y-10 max-w-3xl">
      {isSplitView ? (
        <nav
          aria-label="Session floor sections"
          className="flex flex-wrap gap-2 border-b border-white/15 pb-3"
        >
          <SessionFloorNavLink href="/chair/session" label="Overview" />
          <SessionFloorNavLink href="/chair/session/motions" label="Motions" />
          <SessionFloorNavLink href="/chair/session/timer" label="Timer" />
          <SessionFloorNavLink href="/chair/session/announcements" label="Announcements" />
          <SessionFloorNavLink href="/chair/session/speakers" label="Speakers" />
          <SessionFloorNavLink href="/chair/session/roll-call" label="Roll call" />
        </nav>
      ) : null}
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      {msg && (
        <p className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-brand-navy shadow-sm">
          {msg}
        </p>
      )}

      {show("motions") ? (
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Motion control</h3>
        <p className="text-xs text-brand-muted">
          Chair-only: one vote open at a time. Delegates do not vote in the app — use{" "}
          <span className="font-medium text-brand-navy/90">Record votes</span> below to call each placard, enter Yes or
          No, or skip if absent (skipped delegations are not counted). For several motions at once, open the motion
          floor, record stated motions, close the floor, then begin voting in{" "}
          <span className="font-medium text-brand-navy/90">most disruptive first</span> (RoP).
        </p>
        <div className={`${surfaceCard} space-y-3`}>
          <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 space-y-2">
            <p className="text-sm font-medium text-brand-navy">
              Motion floor:{" "}
              <span className={motionFloorOpen ? "text-amber-300" : "text-brand-muted"}>
                {motionFloorOpen ? "open for statements" : "closed"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || !!openMotion || motionFloorOpen}
                onClick={openMotionFloorForStatements}
                className="px-3 py-2 rounded-lg bg-brand-gold text-brand-navy text-sm font-medium disabled:opacity-50"
              >
                Open floor for motion statements
              </button>
              <button
                type="button"
                disabled={pending || !motionFloorOpen}
                onClick={closeMotionFloorForStatements}
                className="px-3 py-2 rounded-lg border border-white/25 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20 disabled:opacity-50"
              >
                Close floor (statements ended)
              </button>
              <button
                type="button"
                disabled={
                  pending ||
                  !motionFloorOpen ||
                  !!openMotion ||
                  !motionDraft.title.trim() ||
                  (motionRequiresClauseTargets(motionDraft.procedure_code) &&
                    (!motionDraft.procedure_resolution_id || motionDraft.procedure_clause_ids.length === 0)) ||
                  (motionRequiresResolutionOnly(motionDraft.procedure_code) &&
                    !motionDraft.procedure_resolution_id)
                }
                onClick={recordStatedMotion}
                className="rounded-lg border border-amber-500/50 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
              >
                Record stated motion
              </button>
              <button
                type="button"
                disabled={
                  pending || motionFloorOpen || !!openMotion || pendingStatedMotions.length === 0
                }
                onClick={beginVotingInDisruptivenessOrder}
                className="px-3 py-2 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                Begin voting (most disruptive first)
              </button>
            </div>
          </div>

          {pendingStatedMotions.length > 0 ? (
            <div className="rounded-lg border border-white/12 bg-black/25 px-3 py-2 space-y-2">
              <p className={surfaceLabel}>Pending — vote order (most disruptive first)</p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-brand-navy">
                {pendingStatedMotions.map((m, i) => (
                  <li key={m.id} className="pl-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium">#{i + 1}</span> — {m.title || "Untitled"}
                        <span className="text-brand-muted/70 text-xs block sm:inline sm:ml-2">
                          ({m.procedure_code ?? m.vote_type}, RoP priority {motionDisruptivenessScore(m.vote_type, m.procedure_code)})
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => withdrawStatedMotion(m.id)}
                        className="text-xs text-red-700 font-medium hover:underline shrink-0"
                      >
                        Withdraw
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <label className="text-sm text-brand-navy">
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

          {motionRequiresClauseTargets(motionDraft.procedure_code) ||
          motionRequiresResolutionOnly(motionDraft.procedure_code) ? (
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

              {motionRequiresClauseTargets(motionDraft.procedure_code) ? (
                <div className="space-y-1">
                  <p className={surfaceLabel}>Target clauses</p>
                  <div className={surfaceInset}>
                    {selectedResolutionClauses.length === 0 ? (
                      <p className="text-xs text-brand-muted">No clauses found for selected resolution.</p>
                    ) : (
                      selectedResolutionClauses.map((c) => {
                        const checked = motionDraft.procedure_clause_ids.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-start gap-2 text-xs cursor-pointer text-brand-navy">
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
              ) : null}
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm text-brand-navy">
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
            <div className="text-sm text-brand-navy rounded-lg border border-white/15 bg-black/20 px-3 py-2">
              <span className={surfaceLabel}>Required majority (RoP)</span>
              <p className="mt-1 font-semibold text-brand-navy">{formatVoteMajorityLabel(ropMajorityForDraft)}</p>
              <p className="text-xs text-brand-muted mt-1 leading-snug">
                Simple for procedural motions; two-thirds for resolutions, amendments, and motions to approve an
                amendment (Amendments preset).
              </p>
            </div>
          </div>
          <label className="text-sm block text-brand-navy">
            <span className={surfaceLabel}>Title</span>
            <input
              className={surfaceField}
              value={motionDraft.title}
              onChange={(e) => setMotionDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Motion title"
            />
          </label>
          <label className="text-sm block text-brand-navy">
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
          <label className="text-sm block text-brand-navy">
            <span className={surfaceLabel}>Description</span>
            <textarea
              className={`${surfaceInputCore} mt-1 min-h-[72px]`}
              value={motionDraft.description}
              onChange={(e) => setMotionDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <label className="text-sm inline-flex items-center gap-2 text-brand-navy">
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
                disabled={
                  pending ||
                  !motionDraft.title.trim() ||
                  (motionRequiresClauseTargets(motionDraft.procedure_code) &&
                    (!motionDraft.procedure_resolution_id || motionDraft.procedure_clause_ids.length === 0)) ||
                  (motionRequiresResolutionOnly(motionDraft.procedure_code) &&
                    !motionDraft.procedure_resolution_id)
                }
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
                  className="px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-brand-navy text-sm font-medium hover:bg-white/20 disabled:opacity-50"
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
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Delete this motion permanently? All recorded votes for it will be removed and the motion will disappear from the record."
                      )
                    ) {
                      return;
                    }
                    if (openMotion) deleteMotionAsChair(openMotion.id);
                  }}
                  className="px-4 py-2 rounded-lg border border-red-800 bg-red-950/40 text-red-100 text-sm font-medium hover:bg-red-950/60 disabled:opacity-50"
                >
                  Delete motion
                </button>
              </>
            )}
          </div>
          <div className="text-xs text-brand-muted font-medium">
            Tally: Yes {motionTally.yes} | No {motionTally.no} | Total {motionTally.total}
            <span className="mt-1 block font-normal text-[0.65rem] leading-snug">
              Total is only recorded Yes and No votes. Skip removes that placard from the count (absent / vacant).
            </span>
          </div>

          {openMotion ? (
            <div className={surfaceSubpanel}>
              <p className={surfaceLabel}>Record votes — one placard at a time</p>
              <p className="text-sm text-brand-muted">
                Delegates cannot vote in the app. Call each country in order, record how they voted, or skip if they
                are not present (their vote is not counted at all).
              </p>
              {votingCallOrder.length === 0 ? (
                <p className="text-sm text-brand-muted">No allocations in this committee.</p>
              ) : voteCallIndex >= votingCallOrder.length ? (
                <div className="space-y-2 text-sm text-brand-navy">
                  <p className="font-medium">End of roll — all placards in the list have been reached.</p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setVoteCallIndex(0)}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
                  >
                    Restart from first placard
                  </button>
                </div>
              ) : (
                (() => {
                  const call = votingCallOrder[voteCallIndex]!;
                  const rollA = rollAttendanceByAllocationId.get(call.id);
                  const rollLabel = rollAttendanceRollLabel(rollA);
                  const recorded = call.user_id ? motionVoteByUser[call.user_id] : undefined;
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-brand-muted">
                        Placard <span className="font-semibold text-brand-navy">{voteCallIndex + 1}</span> of{" "}
                        <span className="font-semibold text-brand-navy">{votingCallOrder.length}</span>
                      </p>
                      <div className="rounded-lg border border-white/12 bg-black/25 px-3 py-2">
                        <p className="font-display text-lg font-semibold text-brand-navy">{call.country}</p>
                        <p className="text-xs text-brand-muted mt-1">
                          Roll: {rollLabel}
                          {call.user_id ? (
                            <>
                              {" "}
                              · Recorded:{" "}
                              <span className="font-medium text-brand-navy">
                                {recorded === "yes"
                                  ? "Yes"
                                  : recorded === "no"
                                    ? "No"
                                    : "— (not counted yet)"}
                              </span>
                            </>
                          ) : (
                            <span className="block mt-1 text-amber-800 dark:text-amber-200/90">
                              No delegate account on this placard — use Skip.
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending || !call.user_id}
                          onClick={() => recordDelegateVoteForCall("yes")}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          disabled={pending || !call.user_id}
                          onClick={() => recordDelegateVoteForCall("no")}
                          className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                        >
                          No
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={skipDelegateVoteForCall}
                          className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-white/15 disabled:opacity-50"
                        >
                          Skip (absent — no vote)
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          disabled={pending || voteCallIndex <= 0}
                          onClick={() => setVoteCallIndex((i) => Math.max(0, i - 1))}
                          className="text-sm font-medium text-brand-navy underline decoration-brand-muted/50 hover:decoration-brand-navy disabled:opacity-40 disabled:no-underline"
                        >
                          Previous placard
                        </button>
                        <button
                          type="button"
                          disabled={pending || voteCallIndex >= votingCallOrder.length}
                          onClick={() =>
                            setVoteCallIndex((i) => Math.min(i + 1, votingCallOrder.length))
                          }
                          className="text-sm font-medium text-brand-navy underline decoration-brand-muted/50 hover:decoration-brand-navy disabled:opacity-40 disabled:no-underline"
                        >
                          Next placard (no vote)
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          ) : null}
        </div>

        <div className={surfaceCard}>
          <p className={`${surfaceLabel} mb-2 tracking-wider`}>Audit timeline</p>
          {motionAudit.length === 0 ? (
            <p className="text-sm text-brand-muted">No audit events yet.</p>
          ) : (
            <ul className="space-y-1 text-sm text-brand-navy">
              {motionAudit.map((e) => (
                <li key={e.id}>
                  <span className="capitalize font-medium">{e.event_type}</span>{" "}
                  <span className="text-brand-muted">({new Date(e.created_at).toLocaleString()})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={surfaceCard}>
          <p className={`${surfaceLabel} mb-2 tracking-wider`}>Recent motions</p>
          <ul className="space-y-2 text-sm text-brand-navy">
            {recentMotions.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {m.title || "Untitled"}{" "}
                  <span className="text-brand-muted">(closed)</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || !!openMotion}
                    onClick={() => reopenMotion(m.id)}
                    className="text-xs text-amber-700 font-medium hover:underline disabled:opacity-50"
                  >
                    Reopen
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete “${m.title || "Untitled"}” permanently? This removes the closed motion from the record.`
                        )
                      ) {
                        return;
                      }
                      deleteMotionAsChair(m.id);
                    }}
                    className="text-xs text-red-700 font-medium hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {show("timer") ? (
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Timer</h3>
        <div className={`${surfaceCard} space-y-3`}>
          <p className="text-sm text-brand-muted">
            Choose whether this timer is for <strong className="font-medium text-brand-navy">general floor</strong>{" "}
            (always visible to delegates) or tied to the{" "}
            <strong className="font-medium text-brand-navy">motion open for voting</strong> (delegates only see it while
            that vote is the active item). With <strong className="font-medium text-brand-navy">per-speaker time</strong>{" "}
            on, the clock stays visible during moderated caucus regardless.{" "}
            <strong className="font-medium text-brand-navy">Pause clock</strong> /{" "}
            <strong className="font-medium text-brand-navy">Start clock</strong> freeze or resume the countdown.
            Presets set duration and a <strong className="font-medium text-brand-navy">floor label</strong> delegates
            see next to the timer. Pauses are logged with a short reason.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="block text-sm text-brand-navy min-w-[12rem]">
              <span className={surfaceLabel}>Named preset</span>
              <select
                className={`${surfaceField} mt-1`}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const p = BUILTIN_TIMER_PRESETS.find((x) => x.id === id);
                  if (!p) return;
                  const f = presetToTimerFields(p);
                  setTimer((t) => ({ ...t, ...f }));
                }}
              >
                <option value="">Apply preset…</option>
                {BUILTIN_TIMER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-1 min-w-[10rem] text-sm text-brand-navy">
              <span className={surfaceLabel}>Floor label (delegates)</span>
              <input
                className={`${surfaceField} mt-1`}
                placeholder="e.g. GSL 60s"
                value={timer.floorLabel}
                onChange={(e) => setTimer((t) => ({ ...t, floorLabel: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm text-brand-navy">
            <span className={surfaceLabel}>Timer purpose</span>
            <select
              className={`${surfaceField} mt-1`}
              value={timer.purpose}
              onChange={(e) => {
                const v = e.target.value as "general_floor" | "motion_vote";
                setTimer((t) => ({
                  ...t,
                  purpose: v,
                  boundVoteItemId: v === "general_floor" ? "" : t.boundVoteItemId,
                }));
              }}
            >
              <option value="general_floor">General debate / floor (not tied to a vote)</option>
              <option value="motion_vote">Open motion — timer only while that vote is active on the floor</option>
            </select>
          </label>
          {timer.purpose === "motion_vote" ? (
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>Open motion (must be open for voting)</span>
              <select
                className={`${surfaceField} mt-1`}
                value={timer.boundVoteItemId}
                onChange={(e) => setTimer((t) => ({ ...t, boundVoteItemId: e.target.value }))}
              >
                <option value="">Select motion…</option>
                {openVotingMotions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title?.trim() || "Untitled"} · {m.vote_type}
                    {m.procedure_code ? ` (${m.procedure_code})` : ""}
                  </option>
                ))}
              </select>
              {openVotingMotions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                  No motion is open for voting. Open a vote first, or switch purpose to general floor.
                </p>
              ) : null}
            </label>
          ) : null}
          <p className="text-sm text-brand-navy">
            <span className={surfaceLabel}>Clock</span>{" "}
            <span className="font-medium">{timer.isRunning ? "Running" : "Paused"}</span>
            {!liveTimerRow ? (
              <span className="text-brand-muted font-normal"> — save the timer to enable pause/start.</span>
            ) : null}
          </p>
          <label className="block text-sm text-brand-navy">
            <span className={surfaceLabel}>Pause reason (logged)</span>
            <input
              className={`${surfaceField} mt-1`}
              placeholder="e.g. Point of order, tech issue, unmoderated caucus…"
              value={pauseReasonDraft}
              onChange={(e) => setPauseReasonDraft(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !liveTimerRow || !timer.isRunning}
              onClick={stopFloorTimer}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream disabled:opacity-50"
            >
              <Pause className="h-4 w-4 shrink-0" aria-hidden />
              Pause clock
            </button>
            <button
              type="button"
              disabled={pending || !liveTimerRow || timer.isRunning}
              onClick={startFloorTimer}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream disabled:opacity-50"
            >
              <Play className="h-4 w-4 shrink-0" aria-hidden />
              Start clock
            </button>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              className="mt-1 rounded border-brand-line"
              checked={timer.perSpeakerMode}
              onChange={(e) => setTimer((t) => ({ ...t, perSpeakerMode: e.target.checked }))}
            />
            <span>
              <span className="font-medium">Per-speaker time (moderated caucus)</span>
              <span className="block text-brand-muted text-xs mt-0.5">
                Total = cap each speaker gets; use Advance to move to the next queue speaker and reset the clock.
              </span>
            </span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>Current speaker</span>
              <input
                className={surfaceField}
                value={timer.current}
                onChange={(e) => setTimer((t) => ({ ...t, current: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>Next speaker</span>
              <input
                className={surfaceField}
                value={timer.next}
                onChange={(e) => setTimer((t) => ({ ...t, next: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <label className="text-sm text-brand-navy">
              <span className={surfaceLabel}>Time left</span>
              <div className="flex gap-1 mt-1 items-center">
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.leftM}
                  onChange={(e) => setTimer((t) => ({ ...t, leftM: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">m</span>
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.leftS}
                  onChange={(e) => setTimer((t) => ({ ...t, leftS: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">s</span>
              </div>
            </label>
            <label className="text-sm text-brand-navy">
              <span className={surfaceLabel}>{timer.perSpeakerMode ? "Per-speaker cap" : "Total"}</span>
              <div className="flex gap-1 mt-1 items-center">
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.totalM}
                  onChange={(e) => setTimer((t) => ({ ...t, totalM: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">m</span>
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  value={timer.totalS}
                  onChange={(e) => setTimer((t) => ({ ...t, totalS: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">s</span>
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
            {timer.perSpeakerMode ? (
              <button
                type="button"
                disabled={pending}
                onClick={advanceSpeakerAndResetClock}
                className="px-4 py-2 rounded-lg border border-brand-navy/20 bg-white text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
              >
                Advance speaker & reset clock
              </button>
            ) : null}
          </div>
          {pauseEvents.length > 0 ? (
            <div className="border-t border-white/12 pt-3">
              <p className={`${surfaceLabel} mb-2`}>Recent pause log</p>
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs text-brand-navy/85">
                {pauseEvents.map((ev) => (
                  <li key={ev.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <time className="shrink-0 text-brand-muted" dateTime={ev.created_at}>
                      {new Date(ev.created_at).toLocaleString()}
                    </time>
                    <span>{ev.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {show("announcements") ? (
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Dais announcements</h3>
        <div className={`${surfaceCard} space-y-3`}>
          <p className="text-sm text-brand-muted">
            Use <strong className="font-medium text-brand-navy">Markdown</strong> for bold, lists, and links. Pin one
            line for the floor strip; schedule a future <strong className="font-medium text-brand-navy">publish</strong>{" "}
            time and delegates will only see it once that moment passes. You can <strong className="font-medium text-brand-navy">edit</strong> or{" "}
            <strong className="font-medium text-brand-navy">delete</strong> any line below.
          </p>
          <label className="block text-sm text-brand-navy">
            <span className={surfaceLabel}>Message</span>
            <textarea
              className={`${surfaceInputCore} mt-1 min-h-[100px] font-mono text-sm`}
              placeholder="Message to the committee…"
              value={daisBody}
              onChange={(e) => setDaisBody(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>Format</span>
              <select
                className={`${surfaceField} mt-1`}
                value={daisFormat}
                onChange={(e) => setDaisFormat(e.target.value as "plain" | "markdown")}
              >
                <option value="markdown">Markdown</option>
                <option value="plain">Plain text</option>
              </select>
            </label>
            <label className="block text-sm text-brand-navy min-w-[12rem]">
              <span className={surfaceLabel}>Publish at (optional)</span>
              <input
                type="datetime-local"
                className={`${surfaceField} mt-1`}
                value={daisPublishAt}
                onChange={(e) => setDaisPublishAt(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={postDais}
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-navy text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Post
          </button>
          <ul className="text-sm space-y-3 border-t border-white/12 pt-3 text-brand-navy/85">
            {announcements.map((a) => {
              const fmt = a.body_format === "markdown" ? "markdown" : "plain";
              const scheduled =
                a.publish_at && !Number.isNaN(new Date(a.publish_at).getTime())
                  ? new Date(a.publish_at) > new Date()
                  : false;
              const editing = daisEditingId === a.id;
              return (
                <li key={a.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <time className="text-brand-muted" dateTime={a.created_at}>
                      {new Date(a.created_at).toLocaleString()}
                    </time>
                    {a.is_pinned ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-semibold text-amber-950 dark:text-amber-100">
                        Pinned
                      </span>
                    ) : null}
                    {scheduled ? (
                      <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-900 dark:text-blue-100">
                        Scheduled {new Date(a.publish_at!).toLocaleString()}
                      </span>
                    ) : null}
                    <span className="text-brand-muted">{fmt === "markdown" ? "Markdown" : "Plain"}</span>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <textarea
                        className={`${surfaceInputCore} min-h-[100px] w-full font-mono text-sm`}
                        value={daisEditBody}
                        onChange={(e) => setDaisEditBody(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-4">
                        <label className="block text-sm text-brand-navy">
                          <span className={surfaceLabel}>Format</span>
                          <select
                            className={`${surfaceField} mt-1`}
                            value={daisEditFormat}
                            onChange={(e) => setDaisEditFormat(e.target.value as "plain" | "markdown")}
                          >
                            <option value="markdown">Markdown</option>
                            <option value="plain">Plain text</option>
                          </select>
                        </label>
                        <label className="block text-sm text-brand-navy min-w-[12rem]">
                          <span className={surfaceLabel}>Publish at</span>
                          <input
                            type="datetime-local"
                            className={`${surfaceField} mt-1`}
                            value={daisEditPublishAt}
                            onChange={(e) => setDaisEditPublishAt(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={saveDaisEdit}
                          className="rounded-lg bg-brand-gold px-3 py-1.5 text-sm font-medium text-brand-navy hover:opacity-90 disabled:opacity-50"
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={cancelEditDais}
                          className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-white/10 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <DaisAnnouncementBody body={a.body} format={fmt} />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.is_pinned ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDaisPinned(a.id, false)}
                            className="text-xs font-medium text-brand-navy underline hover:no-underline disabled:opacity-50"
                          >
                            Unpin
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDaisPinned(a.id, true)}
                            className="text-xs font-medium text-brand-navy underline hover:no-underline disabled:opacity-50"
                          >
                            Pin to floor
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => beginEditDais(a)}
                          className="text-xs font-medium text-brand-navy underline hover:no-underline disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => deleteDaisAnnouncement(a.id)}
                          className="text-xs font-medium text-red-800 underline hover:no-underline dark:text-red-300 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      ) : null}

      {show("speakers") ? (
      <section ref={speakersSectionRef} className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">Speakers queue</h3>
        <div className={`${surfaceCard} space-y-3`}>
          {showModeratedCaucusQueuePrompt ? (
            <div className="rounded-lg border-2 border-amber-500/80 bg-amber-50 p-3 space-y-3 text-brand-navy">
              <div className="flex gap-2 items-start">
                <ListOrdered className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-amber-950">Moderated caucus passed</p>
                  <p className="text-sm text-brand-navy/85">
                    Add delegates to the speakers queue for this caucus. They appear in the order you add them
                    (single <strong className="font-medium">Add</strong> below adds one at a time to the end).
                    Or tick several allocations and use <strong className="font-medium">Add selected</strong>—they
                    are appended in committee list order. Delegates can still use Request to speak on their own.
                  </p>
                </div>
              </div>
              {allocations.length === 0 ? (
                <p className="text-sm text-brand-muted">
                  No allocations are loaded for this committee yet. Dismiss when ready—you can add speakers later from
                  the queue controls.
                </p>
              ) : allocations.some((a) => !activeQueueAllocationIds.has(a.id)) ? (
                <div className="space-y-2">
                  <p className={`${surfaceLabel} text-brand-muted`}>Quick add (not yet waiting or current)</p>
                  <ul className="max-h-40 overflow-y-auto rounded border border-amber-200/80 bg-black/40 p-2 space-y-1.5 text-sm">
                    {allocations.map((a) => {
                      if (activeQueueAllocationIds.has(a.id)) return null;
                      const checked = caucusBulkPick.includes(a.id);
                      return (
                        <li key={a.id}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCaucusBulkPick(a.id)}
                            />
                            <span>{a.country}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending || caucusBulkPick.length === 0}
                      onClick={addBulkModeratedCaucusSpeakers}
                      className="px-3 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
                    >
                      Add selected to queue
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setShowModeratedCaucusQueuePrompt(false);
                        setCaucusBulkPick([]);
                      }}
                      className="px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20"
                    >
                      Dismiss reminder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-brand-muted">
                    Every allocation already has a waiting or current slot. Remove entries if you need to reorder, or
                    dismiss when you are done.
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setShowModeratedCaucusQueuePrompt(false);
                      setCaucusBulkPick([]);
                    }}
                    className="px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20"
                  >
                    Dismiss reminder
                  </button>
                </div>
              )}
              {allocations.length === 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setShowModeratedCaucusQueuePrompt(false);
                    setCaucusBulkPick([]);
                  }}
                  className="px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20"
                >
                  Dismiss reminder
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm flex-1 min-w-[12rem] text-brand-navy">
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
              className="px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-brand-navy text-sm font-medium hover:bg-white/20 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2 text-brand-navy">
            {queue.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/12"
              >
                <span className="font-medium">
                  {q.label || "—"}{" "}
                  <span className="text-xs font-normal text-brand-muted">({q.status})</span>
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
      ) : null}

      {show("roll-call") ? (
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">✅ Roll Call Tracker</h3>
        <p className="text-sm text-brand-muted">
          Present (may abstain from voting), Present and voting (must vote, cannot abstain), or Absent. Click to
          cycle.
        </p>
        <div className={`${surfaceCard} space-y-4`}>
          <button
            type="button"
            disabled={pending}
            onClick={initRollCall}
            className="px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-brand-navy text-sm font-medium hover:bg-white/20 disabled:opacity-50"
          >
            Initialize rows (all allocations)
          </button>
          {roll.length === 0 ? (
            <p className="text-sm text-brand-muted">
              No roll rows yet. Initialize to create one row per delegate placard from this committee&apos;s allocation
              matrix.
            </p>
          ) : (
            <>
              <div>
                <h4 className="font-display text-base font-semibold text-brand-navy">👥 Delegates</h4>
                <p className="mt-1 text-sm text-brand-muted">
                  Click a delegate&apos;s status to cycle: Absent → Present (may abstain) → Present and voting →
                  Absent.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-brand-navy">
                {roll.map((r) => {
                  const emb = r.allocations;
                  const row = Array.isArray(emb) ? emb[0] : emb;
                  const country = row?.country ?? r.allocation_id.slice(0, 8);
                  const att = r.attendance;
                  return (
                    <li key={r.allocation_id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{country}</span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => cycleRollAttendanceForRow(r.allocation_id)}
                        className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-left text-sm font-medium text-brand-navy hover:bg-white/20 disabled:opacity-50"
                      >
                        {rollAttendanceShortLabel(att)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}
