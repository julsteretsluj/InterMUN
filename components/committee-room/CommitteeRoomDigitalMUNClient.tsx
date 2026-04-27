"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
    blue: "bg-brand-accent/10 border-brand-accent/28 dark:bg-brand-accent/18 dark:border-brand-accent/35",
    silver: "bg-brand-navy/5 border-brand-navy/15 dark:bg-white/5 dark:border-white/12",
    accent: "bg-brand-accent/10 border-brand-accent/30 dark:bg-brand-accent/18 dark:border-brand-accent/35",
    sky: "bg-sky-500/10 border-sky-500/30 dark:bg-sky-500/18 dark:border-sky-500/38",
  } as const;
  const interactive = Boolean(onPress);
  const className = [
    "w-full rounded-lg border px-3 py-2 text-left shadow-sm",
    tones[tint],
    interactive
      ? "cursor-pointer hover:brightness-110 active:scale-[0.98] transition-[transform,filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent-bright"
      : "",
  ].join(" ");

  if (onPress) {
    return (
      <button type="button" className={className} onClick={onPress} title={title}>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brand-muted dark:text-white/65">{label}</p>
        <p className="mt-0.5 text-base font-semibold tabular-nums text-brand-navy dark:text-white">{value}</p>
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-brand-muted dark:text-white/65">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-brand-navy dark:text-white">{value}</p>
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
  const t = useTranslations("views.committeeRoom");
  const ts = useTranslations("views.session.requestToSpeak");
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
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [delegationSearch, setDelegationSearch] = useState("");
  const [scrollMatchNonce, setScrollMatchNonce] = useState(0);
  const [myRollAttendance, setMyRollAttendance] = useState<RollAttendance | null>(null);
  const [myRollApprovalLoaded, setMyRollApprovalLoaded] = useState(false);
  const [rollChoicePending, setRollChoicePending] = useState(false);
  const [rollChoiceError, setRollChoiceError] = useState<string | null>(null);

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
      setSessionStartedAt(ps?.committee_session_started_at ?? null);
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
          setSessionStartedAt(row?.committee_session_started_at ?? null);
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
  const shouldPromptDelegateRollChoice =
    isDelegate &&
    Boolean(myAllocationId) &&
    Boolean(sessionStartedAt) &&
    myRollApprovalLoaded &&
    (!myRollAttendance || myRollAttendance === "absent");

  function trRequestToSpeak(key: string, fallback: string): string {
    try {
      return ts(key as never) as string;
    } catch {
      return fallback;
    }
  }

  async function submitDelegateRollChoice(attendance: "present_abstain" | "present_voting") {
    if (!shouldPromptDelegateRollChoice) return;
    setRollChoicePending(true);
    setRollChoiceError(null);
    const { error } = await supabase.rpc("delegate_set_roll_attendance", {
      p_conference_id: conferenceId,
      p_attendance: attendance,
    });
    if (error) {
      setRollChoiceError(error.message || "Could not save roll-call attendance.");
    }
    setRollChoicePending(false);
  }

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
    <div className="w-full space-y-4">
      <div className={["xl:grid", layoutColumns, "xl:gap-5 xl:items-start"].join(" ")}>
        {/* Left rail — context & stats (mockup sidebar) */}
        <aside className="mb-4 h-fit space-y-2.5 xl:sticky xl:top-4 xl:mb-0">
          <div className="rounded-xl border border-brand-navy/10 bg-brand-paper p-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-[#12121A] dark:shadow-[0_20px_40px_-28px_rgba(0,0,0,0.75)]">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">{t("committeeLabel")}</p>
            <p className="mt-2 font-display text-sm font-semibold text-brand-navy leading-snug break-words dark:text-white">
              {committeeName}
            </p>
            <p className="mt-1 text-xs text-brand-muted break-words">{conferenceName}</p>

            <div className="mt-3.5 space-y-2 border-t border-brand-line/50 pt-3.5 dark:border-white/10">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">Your context</p>
              <div className="flex items-start gap-2 rounded-lg border border-brand-navy/10 bg-brand-navy/5 px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
                <UserRound className="size-4 shrink-0 text-brand-accent-bright mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0 text-xs">
                  <p className="text-brand-muted">Role</p>
                  <p className="font-medium text-brand-navy capitalize dark:text-white">{role}</p>
                  {myAllocationCountry ? (
                    <p className="text-brand-muted mt-1">
                      Seat · <span className="text-brand-navy/90 dark:text-white/90">{myAllocationCountry}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <StatMiniCard
              label="Assigned"
              value={assignedCount}
              tint="blue"
              onPress={() => setDelegationSearch("")}
              title={t("clearSearchTitle")}
            />
            <StatMiniCard
              label={t("vacantLabel")}
              value={vacantCount}
              tint="silver"
              onPress={() => setDelegationSearch("vacant")}
              title={t("searchVacantTitle")}
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

          <div className="rounded-lg border border-brand-navy/10 bg-brand-accent/8 p-2.5 text-xs leading-relaxed text-brand-navy/90 dark:border-white/10 dark:bg-brand-accent/12 dark:text-white/85">
            <div className="flex items-center gap-2 font-semibold text-brand-navy mb-1 dark:text-white">
              <Sparkles className="size-3.5 text-brand-silver shrink-0" />
              Tip
            </div>
            {t("searchHint")}
          </div>
        </aside>

        {/* Center — digital display */}
        <section className="mb-4 min-w-0 space-y-2.5 xl:mb-0">
          <div className="flex flex-col gap-2.5 rounded-xl border border-brand-navy/10 bg-brand-paper px-3.5 py-2.5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)] sm:flex-row sm:items-center sm:gap-3.5 dark:border-white/10 dark:bg-[#12121A] dark:shadow-[0_20px_40px_-28px_rgba(0,0,0,0.75)]">
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brand-muted">
                Digital display
              </p>
              <p className="break-words font-display text-[0.95rem] font-semibold leading-tight text-brand-navy sm:text-base dark:text-white">
                {committeeName}
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0 w-full sm:w-auto min-w-0 sm:min-w-[13rem]">
              <label htmlFor={searchFieldId} className="sr-only">
                {t("findLabel")}
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-brand-navy/10 bg-brand-navy/5 py-1 pl-2.5 pr-1 dark:border-white/10 dark:bg-black/25">
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
                  placeholder={t("searchPlaceholder")}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-xs text-brand-navy placeholder:text-brand-muted/70 focus:outline-none py-1.5 dark:text-white dark:placeholder:text-white/45"
                />
                {delegationSearch ? (
                  <button
                    type="button"
                    onClick={() => setDelegationSearch("")}
                    className="rounded-full p-1.5 text-brand-muted hover:text-brand-navy hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent-bright dark:hover:text-white dark:hover:bg-white/10"
                    aria-label={t("clearSearchTitle")}
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
              <p className="text-[0.65rem] text-brand-muted text-right tabular-nums" aria-live="polite">
                {qNorm ? (
                  <>
                    {t("matchesCount", {
                      matches: delegationMatchCount + daisMatchCount,
                      total: placards.length + dais.length,
                    })}{" "}
                    · Enter scrolls
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
          <aside className="h-fit rounded-xl border border-brand-navy/10 bg-brand-paper p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-white/10 dark:bg-[#12121A]">
            <div className="rounded-lg border border-brand-navy/10 bg-brand-navy/5 p-2.5 dark:border-white/5 dark:bg-black/15">
              <div className="mb-3 flex items-center gap-2">
                <CircleDot className="size-4 text-brand-accent-bright" />
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">Floor</p>
              </div>
              <div className="space-y-4">
                <FloorStatusBar
                  conferenceId={floorConferenceId}
                  observeOnly={false}
                  theme="dark"
                  sessionMiniControls="none"
                  activeMotionVoteItemId={
                    procedureState === "voting_procedure" ? (currentVoteItemId ?? null) : null
                  }
                />
                {isDelegate ? (
                  <>
                    {!delegateFloorUnlocked ? (
                      <div className="rounded-lg border border-brand-navy/10 bg-brand-navy/5 p-2.5 dark:border-white/10 dark:bg-black/20">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-muted">
                          {trRequestToSpeak("rollPromptTitle", "Chair approval required")}
                        </p>
                        <p className="mt-1 text-sm text-brand-navy/90 dark:text-white/85">
                          {shouldPromptDelegateRollChoice ? (
                            trRequestToSpeak(
                              "rollPromptBodyPickStatus",
                              "Session has started. Choose your roll-call status to unlock speaking and voting. This choice cannot be changed."
                            )
                          ) : myRollApprovalLoaded ? (
                            !sessionStartedAt ? (
                              trRequestToSpeak(
                                "rollPromptBodyWaitSessionStart",
                                "Waiting for the chair to start the committee session."
                              )
                            ) : myRollAttendance === null ? (
                              trRequestToSpeak(
                                "rollPromptBodyWaitRollPrompt",
                                "Waiting for roll-call prompt."
                              )
                            ) : (
                              trRequestToSpeak(
                                "rollPromptBodyMarkedAbsent",
                                "You’re currently marked absent. Ask the chair to mark you Present to speak and vote."
                              )
                            )
                          ) : (
                            trRequestToSpeak("rollPromptBodyChecking", "Checking your roll status...")
                          )}
                        </p>
                        {shouldPromptDelegateRollChoice ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={rollChoicePending}
                              onClick={() => void submitDelegateRollChoice("present_abstain")}
                              className="rounded-lg border border-brand-accent/35 bg-brand-accent/12 px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-brand-accent/20 disabled:opacity-50 dark:text-white"
                            >
                              {rollChoicePending
                                ? trRequestToSpeak("rollPromptSaving", "Saving...")
                                : trRequestToSpeak("rollPromptPresent", "Present")}
                            </button>
                            <button
                              type="button"
                              disabled={rollChoicePending}
                              onClick={() => void submitDelegateRollChoice("present_voting")}
                              className="rounded-lg border border-brand-accent/35 bg-brand-accent/18 px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-brand-accent/25 disabled:opacity-50 dark:text-white"
                            >
                              {rollChoicePending
                                ? trRequestToSpeak("rollPromptSaving", "Saving...")
                                : trRequestToSpeak("rollPromptPresentVoting", "Present and voting")}
                            </button>
                          </div>
                        ) : null}
                        {rollChoiceError ? (
                          <p className="mt-2 text-xs text-red-600 dark:text-rose-300" role="alert">
                            {rollChoiceError}
                          </p>
                        ) : null}
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
        <div className="rounded-xl border border-brand-navy/10 bg-brand-paper p-4 shadow-sm md:p-5 dark:border-white/10 dark:bg-[#12121A]">
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="size-4 text-brand-accent-bright" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-muted">Staff · seats</h3>
          </div>
          <CommitteeRoomStaffControls
            allocations={staffAllocations}
            delegates={delegates}
            chairs={chairs}
            staffRole={myRole}
          />
        </div>
      ) : null}
    </div>
  );
}
