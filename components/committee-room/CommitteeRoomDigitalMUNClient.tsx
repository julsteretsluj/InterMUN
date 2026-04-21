"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { UserRound, Search, CircleDot, Gavel, Sparkles, X } from "lucide-react";
import { FloorStatusBar } from "@/components/session/FloorStatusBar";
import { MotionVotingClient } from "@/components/session/MotionVotingClient";
import { RequestToSpeakClient } from "@/components/session/RequestToSpeakClient";
import { VirtualCommitteeRoom } from "@/components/committee-room/VirtualCommitteeRoom";
import type { DaisSeat, DelegatePlacard } from "@/components/committee-room/VirtualCommitteeRoom";
import { CommitteeRoomStaffControls } from "@/components/committee-room/CommitteeRoomStaffControls";
import type { StaffAllocationRow } from "@/lib/committee-room-payload";
import {
  countDelegatePlacardMatches,
  daisSeatMatchesSearch,
  normalizeDelegationSearchQuery,
} from "@/lib/committee-room-delegation-search";
import { createClient } from "@/lib/supabase/client";
import type { RollAttendance } from "@/lib/roll-attendance";
import { parseRollAttendance } from "@/lib/roll-attendance";
import { useLiveDebateConferenceId } from "@/lib/hooks/useLiveDebateConferenceId";

function StatMiniCard({
  label,
  value,
  tint,
  onPress,
  title,
}: {
  label: string;
  value: string | number;
  tint: "blue" | "silver" | "accent" | "sky";
  onPress?: () => void;
  title?: string;
}) {
  const tones = {
    blue: "bg-brand-accent/10 border-brand-accent/28",
    silver: "bg-slate-200/45 border-slate-400/25",
    accent: "bg-brand-accent/10 border-brand-accent/30",
    sky: "bg-cyan-500/10 border-cyan-500/30",
  } as const;
  const interactive = Boolean(onPress);
  const className = [
    "rounded-xl border px-3 py-2.5 shadow-sm text-left w-full",
    tones[tint],
    interactive
      ? "cursor-pointer hover:brightness-110 active:scale-[0.98] transition-[transform,filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-bright"
      : "",
  ].join(" ");

  if (onPress) {
    return (
      <button type="button" className={className} onClick={onPress} title={title}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-brand-navy">{value}</p>
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-brand-navy">{value}</p>
    </div>
  );
}

export function CommitteeRoomDigitalMUNClient({
  conferenceId,
  floorConferenceId: floorConferenceIdProp,
  canonicalConferenceId,
  siblingConferenceIds,
  conferenceName,
  committeeName,
  placards,
  dais,
  myRole,
  myAllocationId,
  myAllocationCountry,
  canManageSeats,
  staffAllocations,
  delegates,
  chairs,
}: {
  conferenceId: string;
  /** Live floor: motions, procedure, timers, speaker queue. */
  floorConferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  conferenceName: string;
  committeeName: string;
  placards: DelegatePlacard[];
  dais: DaisSeat[];
  myRole: string;
  myAllocationId: string | null;
  myAllocationCountry: string | null;
  canManageSeats: boolean;
  staffAllocations: StaffAllocationRow[];
  delegates: { id: string; name: string | null }[];
  chairs: { id: string; name: string | null }[];
}) {
  const role = myRole.toLowerCase();
  const isDelegate = role === "delegate";
  /** Chair/SMT/admin use /chair/session for motion control; delegates (and other roles) keep floor widgets here. */
  const showDelegateFloorPanel =
    role !== "chair" && role !== "smt" && role !== "admin";
  const layoutColumns = showDelegateFloorPanel
    ? "xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,18.5rem)]"
    : "xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]";

  const supabase = useMemo(() => createClient(), []);
  const floorConferenceId = useLiveDebateConferenceId(
    supabase,
    floorConferenceIdProp,
    canonicalConferenceId,
    siblingConferenceIds
  );
  const searchFieldId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [procedureState, setProcedureState] = useState<"debate_open" | "voting_procedure">("debate_open");
  const [currentVoteItemId, setCurrentVoteItemId] = useState<string | null>(null);
  const [delegationSearch, setDelegationSearch] = useState("");
  const [scrollMatchNonce, setScrollMatchNonce] = useState(0);
  const [myRollAttendance, setMyRollAttendance] = useState<RollAttendance | null>(null);
  const [myRollApprovalLoaded, setMyRollApprovalLoaded] = useState(false);

  const delegateFloorUnlocked =
    isDelegate && (myRollAttendance === "present_abstain" || myRollAttendance === "present_voting");

  useEffect(() => {
    let isActive = true;

    async function load() {
      const { data: ps } = await supabase
        .from("procedure_states")
        .select("state, current_vote_item_id, committee_session_started_at")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();

      if (!isActive) return;
      setProcedureState(ps?.state ?? "debate_open");
      setCurrentVoteItemId(ps?.current_vote_item_id ?? null);
    }

    void load();

    const ch = supabase
      .channel(`procedure-state-${floorConferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        (payload) => {
          const row = payload.new as {
            state: "debate_open" | "voting_procedure";
            current_vote_item_id: string | null;
            committee_session_started_at: string | null;
          };
          setProcedureState(row?.state ?? "debate_open");
          setCurrentVoteItemId(row?.current_vote_item_id ?? null);
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      void supabase.removeChannel(ch);
    };
  }, [supabase, floorConferenceId]);

  useEffect(() => {
    if (!isDelegate) return;
    if (!myAllocationId) return;

    let active = true;

    async function load() {
      setMyRollApprovalLoaded(false);
      const { data } = await supabase
        .from("roll_call_entries")
        .select("attendance")
        .eq("conference_id", conferenceId)
        .eq("allocation_id", myAllocationId)
        .maybeSingle();

      if (!active) return;
      const attRaw = (data as { attendance?: string | null } | null)?.attendance ?? null;
      const parsed = parseRollAttendance(attRaw);
      // If no row exists yet, chairs haven't initialized roll call: keep the delegate locked.
      if (!parsed) {
        setMyRollAttendance(null);
      } else {
        setMyRollAttendance(parsed);
      }
      setMyRollApprovalLoaded(true);
    }

    void load();

    const ch = supabase
      .channel(`roll-approval-${conferenceId}-${myAllocationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roll_call_entries",
          filter: `conference_id=eq.${conferenceId} and allocation_id=eq.${myAllocationId}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, isDelegate, myAllocationId]);

  const votingProcedureActive = procedureState === "voting_procedure";

  const assignedCount = useMemo(() => placards.filter((p) => !p.vacant).length, [placards]);
  const vacantCount = useMemo(() => placards.filter((p) => p.vacant).length, [placards]);
  const daisFilled = useMemo(() => dais.filter((s) => s.profileId).length, [dais]);
  const phaseLabel = votingProcedureActive ? "Voting" : "Debate";

  const qNorm = useMemo(() => normalizeDelegationSearchQuery(delegationSearch), [delegationSearch]);
  const delegationMatchCount = useMemo(
    () => countDelegatePlacardMatches(placards, qNorm),
    [placards, qNorm]
  );
  const daisMatchCount = useMemo(() => {
    if (!qNorm) return dais.length;
    return dais.filter((s) => daisSeatMatchesSearch(s, qNorm)).length;
  }, [dais, qNorm]);

  return (
    <div className="w-full space-y-5">
      <div className={["xl:grid", layoutColumns, "xl:gap-5 xl:items-start"].join(" ")}>
        {/* Left rail — context & stats (mockup sidebar) */}
        <aside className="space-y-3 mb-5 xl:mb-0 xl:sticky xl:top-4 h-fit">
          <div className="rounded-2xl border border-brand-accent/20 bg-brand-paper/90 p-3.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">Committee</p>
            <p className="mt-2 font-display text-sm font-semibold text-brand-navy leading-snug break-words">
              {committeeName}
            </p>
            <p className="mt-1 text-xs text-brand-muted break-words">{conferenceName}</p>

            <div className="mt-4 pt-4 border-t border-brand-line/50 space-y-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">Your context</p>
              <div className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2 border border-white/5">
                <UserRound className="size-4 shrink-0 text-brand-accent-bright mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0 text-xs">
                  <p className="text-brand-muted">Role</p>
                  <p className="font-medium text-brand-navy capitalize">{role}</p>
                  {myAllocationCountry ? (
                    <p className="text-brand-muted mt-1">
                      Seat · <span className="text-brand-navy/90">{myAllocationCountry}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatMiniCard
              label="Assigned"
              value={assignedCount}
              tint="blue"
              onPress={() => setDelegationSearch("")}
              title="Clear search and show all delegations"
            />
            <StatMiniCard
              label="Vacant"
              value={vacantCount}
              tint="silver"
              onPress={() => setDelegationSearch("vacant")}
              title='Search for "vacant" seats in the room'
            />
            <StatMiniCard
              label="Dais"
              value={daisFilled}
              tint="accent"
              onPress={() => searchInputRef.current?.focus()}
              title="Focus search (dais titles and names match your query)"
            />
            <StatMiniCard label="Phase" value={phaseLabel} tint="sky" />
          </div>

          <div className="rounded-xl border border-white/10 bg-brand-accent/8 p-3 text-xs text-brand-navy/90 leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-brand-navy mb-1">
              <Sparkles className="size-3.5 text-brand-silver shrink-0" />
              Tip
            </div>
            Use the search bar to filter placards and dais. Press Enter to scroll to the first match. Escape
            clears. Click <strong>Vacant</strong> to jump to empty seats.
          </div>
        </aside>

        {/* Center — digital display */}
        <section className="min-w-0 space-y-3 mb-5 xl:mb-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border border-brand-accent/15 bg-brand-paper/85 px-4 py-2.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brand-muted">
                Digital display
              </p>
              <p className="font-display text-base sm:text-lg font-semibold text-brand-navy break-words leading-tight">
                {committeeName}
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0 w-full sm:w-auto min-w-0 sm:min-w-[13rem]">
              <label htmlFor={searchFieldId} className="sr-only">
                Find a delegation or dais member
              </label>
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/25 pl-3 pr-1 py-1">
                <Search className="size-3.5 opacity-70 shrink-0 text-brand-muted" strokeWidth={2} aria-hidden />
                <input
                  ref={searchInputRef}
                  id={searchFieldId}
                  type="search"
                  value={delegationSearch}
                  onChange={(e) => setDelegationSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setDelegationSearch("");
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setScrollMatchNonce((n) => n + 1);
                    }
                  }}
                  placeholder="Country, name, school…"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-xs text-brand-navy placeholder:text-brand-muted/70 focus:outline-none py-1.5"
                />
                {delegationSearch ? (
                  <button
                    type="button"
                    onClick={() => setDelegationSearch("")}
                    className="rounded-full p-1.5 text-brand-muted hover:text-brand-navy hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent-bright"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
              <p className="text-[0.65rem] text-brand-muted text-right tabular-nums" aria-live="polite">
                {qNorm ? (
                  <>
                    <span className="text-brand-navy/90 font-medium">{delegationMatchCount}</span> of{" "}
                    {placards.length} placards ·{" "}
                    <span className="text-brand-navy/90 font-medium">{daisMatchCount}</span> of {dais.length} dais ·
                    Enter scrolls
                  </>
                ) : (
                  "Type to filter · Enter scrolls to first match"
                )}
              </p>
            </div>
          </div>

          <VirtualCommitteeRoom
            conferenceId={conferenceId}
            conferenceName={conferenceName}
            committeeName={committeeName}
            placards={placards}
            dais={dais}
            helperText={null}
            delegationSearchQuery={delegationSearch}
            scrollToDelegationMatchNonce={scrollMatchNonce}
            compactPlacardDetails={isDelegate}
          />
        </section>

        {/* Right rail — delegate floor (chairs/SMT/admin use Chair → Session) */}
        {showDelegateFloorPanel ? (
          <aside className="rounded-2xl border border-slate-400/20 bg-brand-paper/35 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] h-fit xl:sticky xl:top-4">
            <div className="rounded-xl border border-white/5 bg-black/15 p-3">
              <div className="mb-3 flex items-center gap-2">
                <CircleDot className="size-4 text-brand-accent-bright" />
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">Floor</p>
              </div>
              <div className="space-y-4">
                <FloorStatusBar
                  conferenceId={floorConferenceId}
                  observeOnly={false}
                  theme="dark"
                  activeMotionVoteItemId={
                    procedureState === "voting_procedure" ? (currentVoteItemId ?? null) : null
                  }
                />
                {isDelegate ? (
                  <>
                    {!delegateFloorUnlocked ? (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">
                          Chair approval required
                        </p>
                        <p className="mt-1 text-sm text-brand-navy/90">
                          {myRollApprovalLoaded ? (
                            myRollAttendance === null ? (
                              "Waiting for the chair to initialize roll call."
                            ) : (
                              "You’re currently marked absent. Ask the chair to mark you Present to speak and vote."
                            )
                          ) : (
                            "Checking your roll status..."
                          )}
                        </p>
                      </div>
                    ) : null}

                    {delegateFloorUnlocked ? (
                      <>
                        {procedureState === "voting_procedure" ? (
                          <MotionVotingClient voteItemId={currentVoteItemId ?? null} />
                        ) : null}
                        <RequestToSpeakClient
                          conferenceId={floorConferenceId}
                          allocationId={myAllocationId}
                          allocationCountry={myAllocationCountry}
                          disabled={procedureState === "voting_procedure"}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {canManageSeats ? (
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/80 p-4 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="size-4 text-brand-accent-bright" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">Staff · seats</h3>
          </div>
          <CommitteeRoomStaffControls allocations={staffAllocations} delegates={delegates} chairs={chairs} />
        </div>
      ) : null}
    </div>
  );
}
