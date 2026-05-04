"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useTranslations } from "next-intl";
import { translateAgendaTopicLabel } from "@/lib/i18n/committee-topic-labels";
import type { VoteItem } from "@/types/database";
import { VotingPanel } from "@/components/voting/VotingPanel";
import { ensureAgendaFloorVoteItem } from "@/lib/ensure-agenda-floor-vote-item";

type Topic = { id: string; label: string };

type MotionTally = {
  id: string;
  title: string;
  yes: number;
  no: number;
  abstain: number;
  other: number;
  total: number;
};

export function CommitteeAgendaVotesTab({
  topics,
  liveTopicId,
  pending,
  onSetLiveTopic,
}: {
  topics: Topic[];
  liveTopicId: string;
  pending: boolean;
  onSetLiveTopic: (topicId: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("sessionControlClient");
  const tTopics = useTranslations("agendaTopics");
  const supabase = createClient();
  const [selectedId, setSelectedId] = useState(() => liveTopicId);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [motions, setMotions] = useState<MotionTally[]>([]);
  const [grand, setGrand] = useState({ yes: 0, no: 0, abstain: 0, other: 0 });
  /** True when this topic has at least one vote_item row (motions may have zero ballots). */
  const [topicHasMotions, setTopicHasMotions] = useState(false);

  const [votingPanelTopicId, setVotingPanelTopicId] = useState<string | null>(null);
  const [modalVoteItems, setModalVoteItems] = useState<VoteItem[]>([]);
  const [myRole, setMyRole] = useState("delegate");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!cancelled) setMyRole((p?.role as string | undefined)?.toLowerCase() ?? "delegate");
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!votingPanelTopicId) {
      setModalVoteItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      await ensureAgendaFloorVoteItem(supabase, votingPanelTopicId);
      if (cancelled) return;
      const { data, error } = await supabase
        .from("vote_items")
        .select("*")
        .eq("conference_id", votingPanelTopicId)
        .order("closed_at", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) {
        setModalVoteItems([]);
        return;
      }
      setModalVoteItems((data as VoteItem[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [votingPanelTopicId, supabase]);

  useEffect(() => {
    if (!votingPanelTopicId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVotingPanelTopicId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [votingPanelTopicId]);

  const load = useCallback(
    async (topicId: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data: items, error: e1 } = await supabase
          .from("vote_items")
          .select("id, title, created_at, procedure_code, vote_type")
          .eq("conference_id", topicId)
          .order("created_at", { ascending: false });
        if (e1) throw e1;
        const topicVoteItems = (items ?? []) as Array<{
          id: string;
          title: string | null;
          created_at: string;
          procedure_code?: string | null;
          vote_type?: string | null;
        }>;
        const ids = topicVoteItems.map((r) => r.id);
        if (ids.length === 0) {
          setMotions([]);
          setGrand({ yes: 0, no: 0, abstain: 0, other: 0 });
          setTopicHasMotions(false);
          return;
        }
        setTopicHasMotions(true);
        const { data: voteRows, error: e2 } = await supabase
          .from("votes")
          .select("vote_item_id, value")
          .in("vote_item_id", ids);
        if (e2) throw e2;

        const tallies = new Map<
          string,
          { yes: number; no: number; abstain: number; other: number; total: number }
        >();
        for (const row of topicVoteItems) {
          tallies.set(row.id, { yes: 0, no: 0, abstain: 0, other: 0, total: 0 });
        }
        let gy = 0;
        let gn = 0;
        let ga = 0;
        let go = 0;
        for (const v of voteRows ?? []) {
          const row = tallies.get(v.vote_item_id);
          if (!row) continue;
          const val = String(v.value).toLowerCase();
          if (val === "yes") {
            row.yes++;
            gy++;
          } else if (val === "no") {
            row.no++;
            gn++;
          } else if (val === "abstain") {
            row.abstain++;
            ga++;
          } else {
            row.other++;
            go++;
          }
          row.total++;
        }
        const withVotes: MotionTally[] = topicVoteItems
          .map((row) => {
            const tall = tallies.get(row.id)!;
            const rawTitle = (row.title ?? "").trim();
            return {
              id: row.id,
              title: rawTitle
                ? translateAgendaTopicLabel(tTopics, rawTitle, locale)
                : t("untitled"),
              ...tall,
            };
          })
          .filter((m) => m.total > 0);
        setMotions(withVotes);
        setGrand({ yes: gy, no: gn, abstain: ga, other: go });
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
        setMotions([]);
        setGrand({ yes: 0, no: 0, abstain: 0, other: 0 });
        setTopicHasMotions(false);
      } finally {
        setLoading(false);
      }
    },
    [locale, supabase, t, tTopics]
  );

  useEffect(() => {
    void load(selectedId);
  }, [load, selectedId]);

  useEffect(() => {
    if (!topics.some((x) => x.id === selectedId) && topics[0]) {
      setSelectedId(topics[0].id);
    }
  }, [topics, selectedId]);

  const totalBallots = grand.yes + grand.no + grand.abstain + grand.other;

  const votingPanelTopicLabel =
    topics.find((x) => x.id === votingPanelTopicId)?.label ?? "";

  return (
    <div className="space-y-4">
      <p className="text-xs text-brand-muted max-w-2xl">{t("agendaTabHelp")}</p>

      <div className="flex flex-col gap-2">
        {topics.map((topic) => {
          const isLive = topic.id === liveTopicId;
          const isSelected = topic.id === selectedId;
          return (
            <div
              key={topic.id}
              className={[
                "w-full min-w-0 rounded-xl border px-3 py-2.5 transition-colors",
                isSelected
                  ? "border-brand-accent/60 bg-brand-accent/15 ring-1 ring-brand-accent/35"
                  : "border-white/15 bg-black/20 hover:bg-black/25",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedId(topic.id);
                  setVotingPanelTopicId(topic.id);
                }}
                className="w-full min-w-0 text-left"
                aria-haspopup="dialog"
                aria-expanded={votingPanelTopicId === topic.id}
              >
                <span className="text-sm font-medium text-brand-navy break-words">
                  {translateAgendaTopicLabel(tTopics, topic.label, locale)}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  {isLive ? (
                    <span className="inline-flex rounded-md border border-brand-accent/40 bg-brand-accent/20 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-navy">
                      {t("agendaLiveBadge")}
                    </span>
                  ) : null}
                  <span className="text-[0.65rem] text-brand-muted">{t("agendaOpenVotingPanel")}</span>
                </span>
              </button>
              <button
                type="button"
                disabled={pending || isLive}
                onClick={() => onSetLiveTopic(topic.id)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-1.5 text-xs font-medium text-brand-navy hover:bg-black/40 disabled:opacity-50"
              >
                {t("agendaSetLive")}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/15 bg-black/20 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs font-medium uppercase tracking-wide text-brand-muted`}>
            {t("agendaViewingVotes")} —{" "}
            <span className="font-semibold text-brand-navy normal-case">
              {translateAgendaTopicLabel(
                tTopics,
                topics.find((x) => x.id === selectedId)?.label ?? "",
                locale
              )}
            </span>
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(selectedId)}
            className="rounded-lg border border-white/20 bg-black/25 px-2.5 py-1 text-xs font-medium text-brand-navy hover:bg-black/35 disabled:opacity-50"
          >
            {t("agendaRefresh")}
          </button>
        </div>

        {loadError ? (
          <p className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
        ) : loading ? (
          <p className="text-sm text-brand-muted">{t("agendaLoadingCounts")}</p>
        ) : totalBallots === 0 ? (
          <p className="text-sm text-brand-muted">
            {!topicHasMotions ? t("agendaNoMotionsYet") : t("agendaNoBallotsForTopic")}
          </p>
        ) : (
          <>
            <div className="text-sm text-brand-navy space-y-1">
              <p>{t("agendaBallotsRecorded", { count: totalBallots })}</p>
              <p>{t("agendaMotionsWithBallots", { count: motions.length })}</p>
              <p className="font-medium">
                {t("agendaYesNoAbstainLine", {
                  yes: grand.yes,
                  no: grand.no,
                  abstain: grand.abstain,
                })}
                {grand.other > 0 ? (
                  <span className="text-brand-muted">
                    {" "}
                    · {t("agendaOtherVotes", { count: grand.other })}
                  </span>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted mb-2">
                {t("agendaByMotion")}
              </p>
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {motions.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-white/12 bg-black/25 px-3 py-2 text-sm text-brand-navy"
                  >
                    <p className="font-medium line-clamp-2">{m.title}</p>
                    <p className="text-xs text-brand-muted mt-1">
                      {t("agendaYesNoAbstainLine", {
                        yes: m.yes,
                        no: m.no,
                        abstain: m.abstain,
                      })}
                      {m.other > 0 ? (
                        <span>
                          {" "}
                          · {t("agendaOtherVotes", { count: m.other })}
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {votingPanelTopicId ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-3 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={t("agendaOpenVotingPanel")}
          onClick={() => setVotingPanelTopicId(null)}
        >
          <div
            className="flex max-h-[min(92vh,48rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[var(--color-bg-page)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-brand-muted">
                  {t("agendaOpenVotingPanel")}
                </p>
                <h2 className="font-display mt-1 text-base font-semibold leading-snug text-brand-navy line-clamp-3">
                  {votingPanelTopicLabel
                    ? translateAgendaTopicLabel(tTopics, votingPanelTopicLabel, locale)
                    : "—"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVotingPanelTopicId(null)}
                className="shrink-0 rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-black/30"
              >
                {t("agendaCloseVotingPanel")}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <VotingPanel
                voteItems={modalVoteItems}
                myRole={myRole}
                forceManageVotes
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
