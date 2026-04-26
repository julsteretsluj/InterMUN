"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { VoteItem } from "@/types/database";
import { HelpButton } from "@/components/HelpButton";
import {
  DAIS_SEAT_CO_CHAIR,
  DAIS_SEAT_HEAD_CHAIR,
  sortAllocationsByDisplayCountry,
} from "@/lib/allocation-display-order";
import { parseRollAttendance, type RollAttendance } from "@/lib/roll-attendance";
import { LocalTabs } from "@/components/ui/Tabs";

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
  const t = useTranslations("views.voting");
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [drafts, setDrafts] = useState<Record<string, { must_vote: boolean; required_majority: string }>>({});
  const [rosterByConferenceId, setRosterByConferenceId] = useState<Record<string, VotingRosterEntry[]>>({});
  const supabase = createClient();

  const canManageVotes = myRole === "chair";

  function majorityLabel(requiredMajority: string): string {
    return requiredMajority === "2/3" ? t("majorityTwoThirds") : t("majoritySimple");
  }

  function voteTypeLabel(voteType: string): string {
    if (voteType === "motion" || voteType === "amendment" || voteType === "resolution") {
      return t(`voteTypes.${voteType}`);
    }
    return voteType.charAt(0).toUpperCase() + voteType.slice(1);
  }

  function rollAttendanceLabel(att: RollAttendance | undefined): string {
    switch (att) {
      case "absent":
        return t("roll.absent");
      case "present_abstain":
        return t("roll.present_abstain");
      case "present_voting":
        return t("roll.present_voting");
      default:
        return t("roll.unknown");
    }
  }

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
    const typeLabel = voteTypeLabel(item.vote_type);
    const titleLine = item.title?.trim() || t("untitled");
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
                <span className="mun-label">{t("requiredMajority")}</span>
                <HelpButton title={t("helpRequiredMajorityTitle")}>{t("helpRequiredMajorityBody")}</HelpButton>
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
              <option value="simple">{t("majoritySimple")}</option>
              <option value="2/3">{t("majorityTwoThirds")}</option>
            </select>
          </label>
            <div className="flex flex-col items-end gap-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy dark:border-white/12 dark:bg-black/25">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-300 text-brand-diplomatic focus:ring-brand-accent-bright dark:border-white/20"
                  checked={d.must_vote}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...d, must_vote: e.target.checked },
                    }))
                  }
                />
                <span className="font-medium">{t("mustVote")}</span>
              </label>
              <HelpButton title={t("helpMustVoteTitle")}>{t("helpMustVoteBody")}</HelpButton>
            </div>
        </div>
        <button
          type="button"
          className="mun-btn-primary w-full sm:w-auto"
          onClick={() => void saveSettings(item.id, d.must_vote, d.required_majority)}
        >
          {t("saveSettings")}
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
              {item.must_vote ? t("mustVoteBadge") : t("canVoteBadge")}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-brand-muted">
              {t("majorityLine", { label: majorityLabel(item.required_majority) })}
            </span>
          </div>
        </header>

        {myRole === "delegate" ? (
          <p className="mun-muted mt-3 text-sm leading-relaxed">{t("delegateBlurb")}</p>
        ) : null}

        {isClosed ? (
          <div className="mt-4 space-y-4">
            <div className="mun-inset flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="text-center sm:text-left">
                <p className="mun-label">{t("yes")}</p>
                <p className="font-display text-xl font-semibold tabular-nums text-brand-navy">{yes}</p>
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-white/15" aria-hidden />
              <div className="text-center sm:text-left">
                <p className="mun-label">{t("no")}</p>
                <p className="font-display text-xl font-semibold tabular-nums text-brand-navy">{no}</p>
              </div>
              <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-white/15" aria-hidden />
              <div className="text-center sm:text-left">
                <p className="mun-label">{t("ballots")}</p>
                <p className="font-display text-xl font-semibold tabular-nums text-brand-navy">{total}</p>
              </div>
              <div className="w-full border-t border-slate-200 pt-3 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0 dark:border-white/10">
                <p className="mun-label mb-1">{t("outcome")}</p>
                {total > 0 ? (
                  <p
                    className={`font-display text-lg font-semibold ${
                      passes
                        ? "text-brand-diplomatic dark:text-brand-accent-bright"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {passes ? t("passed") : t("failed")}
                  </p>
                ) : (
                  <p className="mun-muted text-sm">{t("noRecordedVotes")}</p>
                )}
              </div>
            </div>

            {canManageVotes ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button type="button" className="mun-btn" onClick={() => void setClosed(item.id, false)}>
                  {t("reopenMotion")}
                </button>
                <details className="group sm:ml-auto">
                  <summary className="mun-btn cursor-pointer list-none py-2 text-center [&::-webkit-details-marker]:hidden">
                    <span className="text-brand-navy group-open:hidden dark:text-brand-navy">{t("editRecordOpen")}</span>
                    <span className="hidden text-brand-navy group-open:inline dark:text-brand-navy">
                      {t("hideSettings")}
                    </span>
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
                <span className="mun-label mr-1">{t("yes")}</span>
                <span className="font-semibold tabular-nums text-brand-navy">{yes}</span>
              </span>
              <span>
                <span className="mun-label mr-1">{t("no")}</span>
                <span className="font-semibold tabular-nums text-brand-navy">{no}</span>
              </span>
              <span>
                <span className="mun-label mr-1">{t("total")}</span>
                <span className="font-semibold tabular-nums text-brand-navy">{total}</span>
              </span>
              {total > 0 ? (
                <span
                  className={`font-semibold ${
                    passes ? "text-brand-diplomatic dark:text-brand-accent-bright" : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {passes ? t("preliminaryPassing") : t("preliminaryFailing")}
                </span>
              ) : null}
            </div>
            {canManageVotes ? (
              <div className="mun-inset space-y-2">
                <p className="mun-label">{t("delegateRollCall", { count: roster.length })}</p>
                {roster.length === 0 ? (
                  <p className="mun-muted">{t("noSeatedDelegates")}</p>
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
                                {t("rollPrefix")} {rollAttendanceLabel(row.rollAttendance)} · {t("recordedPrefix")}{" "}
                                <span className="font-medium text-brand-navy">
                                  {recorded === "yes"
                                    ? t("recordedYes")
                                    : recorded === "no"
                                      ? t("recordedNo")
                                      : recorded === "abstain"
                                        ? t("recordedAbstain")
                                        : t("recordedNone")}
                                </span>
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void recordVoteForMotion(item.id, row.userId, "yes")}
                                className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                              >
                                {t("yes")}
                              </button>
                              {canAbstain ? (
                                <button
                                  type="button"
                                  onClick={() => void recordVoteForMotion(item.id, row.userId, "abstain")}
                                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
                                >
                                  {t("abstain")}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void recordVoteForMotion(item.id, row.userId, "no")}
                                className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
                              >
                                {t("no")}
                              </button>
                              <button
                                type="button"
                                onClick={() => void clearVoteForMotion(item.id, row.userId)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:bg-white/10 dark:text-brand-navy dark:hover:bg-white/15"
                              >
                                {t("clear")}
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
                {t("closeMotion")}
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
        <p className="mun-muted">{t("noMotions")}</p>
      ) : (
        <LocalTabs
          ariaLabel={t("tabs.ariaLabel")}
          options={[
            { id: "open", label: t("tabs.open") },
            { id: "closed", label: t("tabs.closed") },
          ]}
          defaultTab="open"
          renderPanel={(activeTab) =>
            activeTab === "open" ? (
              <section className="space-y-3">
                <h3 className="mun-label">{t("currentOpenMotion")}</h3>
                {openItems.length > 0 ? (
                  <div className="space-y-4">{openItems.map((i) => renderVoteCard(i as VoteItemRow))}</div>
                ) : (
                  <p className="mun-muted">{t("noOpenMotion")}</p>
                )}
              </section>
            ) : (
              <section className="space-y-3">
                <h3 className="mun-label">{t("recentClosedMotions")}</h3>
                {closedItems.length > 0 ? (
                  <div className="space-y-4">{closedItems.map((i) => renderVoteCard(i as VoteItemRow))}</div>
                ) : (
                  <p className="mun-muted">{t("noClosedMotions")}</p>
                )}
              </section>
            )
          }
        />
      )}
    </div>
  );
}
