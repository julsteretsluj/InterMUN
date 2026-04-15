"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VoteItem } from "@/types/database";
import { formatVoteMajorityLabel } from "@/lib/format-vote-majority";
import { HelpButton } from "@/components/HelpButton";
import {
  DAIS_SEAT_CO_CHAIR,
  DAIS_SEAT_HEAD_CHAIR,
  sortAllocationsByDisplayCountry,
} from "@/lib/allocation-display-order";
import { parseRollAttendance, rollAttendanceRollLabel, type RollAttendance } from "@/lib/roll-attendance";

interface Vote {
  value: string;
  user_id: string;
}

type VoteItemRow = VoteItem & { procedure_code?: string | null };
type VotingRosterEntry = {
  allocationId: string;
  userId: string;
  country: string;
  rollAttendance: RollAttendance;
};

export function VotingPanel({
  voteItems,
  myRole,
}: {
  voteItems: VoteItem[];
  myRole: string;
}) {
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [drafts, setDrafts] = useState<Record<string, { must_vote: boolean; required_majority: string }>>({});
  const [rosterByConferenceId, setRosterByConferenceId] = useState<Record<string, VotingRosterEntry[]>>({});
  const supabase = createClient();

  const canManageVotes = myRole === "chair";

  useEffect(() => {
    voteItems.forEach((item) => {
      supabase
        .from("votes")
        .select("value, user_id")
        .eq("vote_item_id", item.id)
        .then(({ data }) => {
          if (data) setVotes((v) => ({ ...v, [item.id]: data }));
        });
    });
  }, [voteItems, supabase]);

  useEffect(() => {
    const conferenceIds = [...new Set(voteItems.map((item) => item.conference_id).filter(Boolean))];
    if (conferenceIds.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const next: Record<string, VotingRosterEntry[]> = {};

      for (const conferenceId of conferenceIds) {
        const [{ data: allocations }, { data: rollRows }] = await Promise.all([
          supabase
            .from("allocations")
            .select("id, country, user_id, profiles(role)")
            .eq("conference_id", conferenceId)
            .order("country", { ascending: true }),
          supabase
            .from("roll_call_entries")
            .select("allocation_id, present, attendance")
            .eq("conference_id", conferenceId),
        ]);

        const rollMap = new Map<string, RollAttendance>();
        for (const row of (rollRows ?? []) as Array<{ allocation_id: string; present?: boolean; attendance?: string | null }>) {
          const att = parseRollAttendance(row.attendance) ?? (row.present === true ? "present_voting" : "absent");
          rollMap.set(row.allocation_id, att);
        }

        const roster = ((allocations ?? []) as Array<{
          id: string;
          country: string;
          user_id: string | null;
          profiles: { role?: string | null } | { role?: string | null }[] | null;
        }>)
          .filter((a) => {
            if (!a.user_id) return false;
            const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            if (profile?.role?.toString().trim().toLowerCase() === "chair") return false;
            const countryKey = (a.country ?? "").trim().toLowerCase();
            return (
              countryKey !== DAIS_SEAT_HEAD_CHAIR.toLowerCase() &&
              countryKey !== DAIS_SEAT_CO_CHAIR.toLowerCase() &&
              countryKey !== "co chair"
            );
          })
          .map((a) => ({
            allocationId: a.id,
            userId: a.user_id as string,
            country: a.country?.trim() || "—",
            rollAttendance: rollMap.get(a.id) ?? "absent",
          }));

        next[conferenceId] = sortAllocationsByDisplayCountry(roster);
      }

      if (!cancelled) {
        setRosterByConferenceId(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [voteItems, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("votes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        (payload) => {
          const vote = payload.new as { vote_item_id: string; value: string };
          if (vote?.vote_item_id) {
            supabase
              .from("votes")
              .select("value, user_id")
              .eq("vote_item_id", vote.vote_item_id)
              .then(({ data }) => {
                if (data) setVotes((v) => ({ ...v, [vote.vote_item_id]: data }));
              });
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function saveSettings(itemId: string, must_vote: boolean, required_majority: string) {
    const { error } = await supabase
      .from("vote_items")
      .update({ must_vote, required_majority })
      .eq("id", itemId);
    if (error) return;
    setDrafts((prev) => ({ ...prev, [itemId]: { must_vote, required_majority } }));
  }

  async function setClosed(itemId: string, closed: boolean) {
    const { error } = await supabase
      .from("vote_items")
      .update({ closed_at: closed ? new Date().toISOString() : null })
      .eq("id", itemId);
    if (error) return;
    location.reload();
  }

  async function recordVoteForMotion(itemId: string, userId: string, value: "yes" | "no" | "abstain") {
    const { error } = await supabase
      .from("votes")
      .upsert({ vote_item_id: itemId, user_id: userId, value }, { onConflict: "vote_item_id,user_id" });
    if (error) return;
    const { data } = await supabase.from("votes").select("value, user_id").eq("vote_item_id", itemId);
    if (data) setVotes((v) => ({ ...v, [itemId]: data }));
  }

  async function clearVoteForMotion(itemId: string, userId: string) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("vote_item_id", itemId)
      .eq("user_id", userId);
    if (error) return;
    const { data } = await supabase.from("votes").select("value, user_id").eq("vote_item_id", itemId);
    if (data) setVotes((v) => ({ ...v, [itemId]: data }));
  }

  function getResult(item: VoteItem) {
    const v = votes[item.id] || [];
    const counted = v.filter((x) => x.value === "yes" || x.value === "no");
    const yes = counted.filter((x) => x.value === "yes").length;
    const no = counted.filter((x) => x.value === "no").length;
    const total = counted.length;
    const passes = yes > (item.required_majority === "2/3" ? (total * 2) / 3 : total / 2);
    return { yes, no, total, passes };
  }

  const openItems = voteItems.filter((i) => !i.closed_at);
  const closedItems = voteItems.filter((i) => !!i.closed_at);

  function renderVoteCard(item: VoteItemRow) {
    const { yes, no, total, passes } = getResult(item);
    const d = drafts[item.id] || { must_vote: item.must_vote, required_majority: item.required_majority };
    const isClosed = !!item.closed_at;
    const typeLabel = item.vote_type.charAt(0).toUpperCase() + item.vote_type.slice(1);
    const titleLine = item.title?.trim() || "Untitled";
    const proc = item.procedure_code?.replace(/_/g, " ");
    const roster = rosterByConferenceId[item.conference_id] ?? [];
    const voteMap: Record<string, "yes" | "no" | "abstain"> = {};
    for (const row of votes[item.id] ?? []) {
      if (row.value === "yes" || row.value === "no" || row.value === "abstain") {
        voteMap[row.user_id] = row.value;
      }
    }

    const chairSettings = canManageVotes ? (
      <div className="mun-inset space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm text-brand-navy dark:text-brand-navy">
              <div className="flex items-center justify-between gap-2">
                <span className="mun-label">Required majority</span>
                <HelpButton title="Required majority">
                  Choose the vote threshold used to decide pass/fail. `Simple` is more than half. `2/3`
                  requires a supermajority.
                </HelpButton>
              </div>
            <select
              value={d.required_majority}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [item.id]: { ...d, required_majority: e.target.value },
                }))
              }
              className="mun-field mt-1.5"
            >
              <option value="simple">Simple</option>
              <option value="2/3">2/3</option>
            </select>
          </label>
            <div className="flex flex-col items-end gap-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy dark:border-white/12 dark:bg-black/25">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-brand-gold-bright dark:border-white/20"
                  checked={d.must_vote}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...d, must_vote: e.target.checked },
                    }))
                  }
                />
                <span className="font-medium">MUST vote</span>
              </label>
              <HelpButton title="MUST vote">
                Marks this motion as a “must-vote” item. This is used to communicate the requirement to
                participants (depending on your committee’s setup).
              </HelpButton>
            </div>
        </div>
        <button
          type="button"
          className="mun-btn-primary w-full sm:w-auto"
          onClick={() => void saveSettings(item.id, d.must_vote, d.required_majority)}
        >
          Save settings
        </button>
      </div>
    ) : null;

    return (
      <article
        key={item.id}
        className={`mun-card ${isClosed ? "opacity-[0.97]" : ""}`}
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/90 pb-3 dark:border-white/10">
          <div className="min-w-0 space-y-1">
            <p className="mun-label">{typeLabel}</p>
            <h3 className="font-display text-lg font-semibold leading-snug text-brand-navy">{titleLine}</h3>
            {proc ? (
              <p className="mun-muted text-xs capitalize">{proc}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                item.must_vote
                  ? "bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100"
                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-brand-muted"
              }`}
            >
              {item.must_vote ? "MUST vote" : "CAN vote"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-brand-muted">
              {formatVoteMajorityLabel(item.required_majority)} majority
            </span>
          </div>
        </header>

        {myRole === "delegate" ? (
          <p className="mun-muted mt-3 text-sm leading-relaxed">
            The dais records votes in session (e.g. roll call). Motion votes here follow Yes/No only (abstain is not
            used). You can follow the tally; delegates do not cast votes in the app.
          </p>
        ) : null}

        {isClosed ? (
          <div className="mt-4 space-y-4">
            <div className="mun-inset flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="text-center sm:text-left">
                <p className="mun-label">Yes</p>
                <p className="font-display text-xl font-semibold tabular-nums text-brand-navy">{yes}</p>
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-white/15" aria-hidden />
              <div className="text-center sm:text-left">
                <p className="mun-label">No</p>
                <p className="font-display text-xl font-semibold tabular-nums text-brand-navy">{no}</p>
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-white/15" aria-hidden />
              <div className="text-center sm:text-left">
                <p className="mun-label">Ballots</p>
                <p className="font-display text-xl font-semibold tabular-nums text-brand-navy">{total}</p>
              </div>
              <div className="w-full border-t border-slate-200 pt-3 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0 dark:border-white/10">
                <p className="mun-label mb-1">Outcome</p>
                {total > 0 ? (
                  <p
                    className={`font-display text-lg font-semibold ${
                      passes
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {passes ? "Passed" : "Failed"}
                  </p>
                ) : (
                  <p className="mun-muted text-sm">No recorded votes</p>
                )}
              </div>
            </div>

            {canManageVotes ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button type="button" className="mun-btn" onClick={() => void setClosed(item.id, false)}>
                  Reopen motion
                </button>
                <details className="group sm:ml-auto">
                  <summary className="mun-btn cursor-pointer list-none py-2 text-center [&::-webkit-details-marker]:hidden">
                    <span className="text-brand-navy group-open:hidden dark:text-brand-navy">Edit record…</span>
                    <span className="hidden text-brand-navy group-open:inline dark:text-brand-navy">Hide settings</span>
                  </summary>
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">{chairSettings}</div>
                </details>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {chairSettings}
            <div className="mun-inset flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span>
                <span className="mun-label mr-1">Yes</span>
                <span className="font-semibold tabular-nums text-brand-navy">{yes}</span>
              </span>
              <span>
                <span className="mun-label mr-1">No</span>
                <span className="font-semibold tabular-nums text-brand-navy">{no}</span>
              </span>
              <span>
                <span className="mun-label mr-1">Total</span>
                <span className="font-semibold tabular-nums text-brand-navy">{total}</span>
              </span>
              {total > 0 ? (
                <span
                  className={`font-semibold ${
                    passes ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {passes ? "Passing" : "Failing"} (preliminary)
                </span>
              ) : null}
            </div>
            {canManageVotes ? (
              <div className="mun-inset space-y-2">
                <p className="mun-label">
                  Delegate roll call ({roster.length})
                </p>
                {roster.length === 0 ? (
                  <p className="mun-muted">No seated delegates available for this motion.</p>
                ) : (
                  <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                    {roster.map((row) => {
                      const recorded = voteMap[row.userId];
                      const abstainAllowedByVoteType =
                        item.vote_type === "resolution" || item.vote_type === "amendment";
                      const canAbstain = abstainAllowedByVoteType && row.rollAttendance !== "present_voting";
                      return (
                        <div
                          key={`${item.id}-${row.allocationId}`}
                          className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-brand-navy">{row.country}</p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-brand-muted">
                                Roll: {rollAttendanceRollLabel(row.rollAttendance)} · Recorded:{" "}
                                <span className="font-medium text-brand-navy">
                                  {recorded === "yes"
                                    ? "Yes"
                                    : recorded === "no"
                                      ? "No"
                                      : recorded === "abstain"
                                        ? "Abstain"
                                        : "—"}
                                </span>
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void recordVoteForMotion(item.id, row.userId, "yes")}
                                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                              >
                                Yes
                              </button>
                              {canAbstain ? (
                                <button
                                  type="button"
                                  onClick={() => void recordVoteForMotion(item.id, row.userId, "abstain")}
                                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                                >
                                  Abstain
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void recordVoteForMotion(item.id, row.userId, "no")}
                                className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => void clearVoteForMotion(item.id, row.userId)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:bg-white/10 dark:text-brand-navy dark:hover:bg-white/15"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
            {canManageVotes ? (
              <button
                type="button"
                className="mun-btn border-rose-300/80 text-rose-800 hover:bg-rose-50 dark:border-rose-500/35 dark:text-rose-200 dark:hover:bg-rose-950/40"
                onClick={() => void setClosed(item.id, true)}
              >
                Close motion
              </button>
            ) : null}
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-8">
      {voteItems.length === 0 ? (
        <p className="mun-muted">No motions yet.</p>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="mun-label">Current open motion</h3>
            {openItems.length > 0 ? (
              <div className="space-y-4">{openItems.map((i) => renderVoteCard(i as VoteItemRow))}</div>
            ) : (
              <p className="mun-muted">No open motion right now.</p>
            )}
          </section>
          {closedItems.length > 0 ? (
            <section className="space-y-3">
              <h3 className="mun-label">Recent closed motions</h3>
              <div className="space-y-4">{closedItems.map((i) => renderVoteCard(i as VoteItemRow))}</div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
