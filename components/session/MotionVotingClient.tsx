"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { translateAgendaTopicLabel } from "@/lib/i18n/committee-topic-labels";

type VoteItemRow = {
  id: string;
  vote_type: "motion" | "amendment" | "resolution" | string;
  title: string | null;
  description: string | null;
  must_vote: boolean;
  required_majority: string;
  motioner_allocation_id: string | null;
  closed_at: string | null;
};

type VoteTally = {
  yes: number;
  no: number;
  total: number;
};

export function MotionVotingClient({ voteItemId }: { voteItemId: string | null }) {
  const t = useTranslations("views.session.motionVoting");
  const tTopics = useTranslations("agendaTopics");
  const supabase = useMemo(() => createClient(), []);
  const [voteItem, setVoteItem] = useState<VoteItemRow | null>(null);
  const [motionerCountry, setMotionerCountry] = useState<string | null>(null);
  const [tally, setTally] = useState<VoteTally>({ yes: 0, no: 0, total: 0 });

  const load = useCallback(async () => {
    if (!voteItemId) {
      setVoteItem(null);
      setMotionerCountry(null);
      setTally({ yes: 0, no: 0, total: 0 });
      return;
    }

    const [{ data: vi }, { data: votes }] = await Promise.all([
      supabase
        .from("vote_items")
        .select(
          "id, vote_type, title, description, must_vote, required_majority, motioner_allocation_id, closed_at"
        )
        .eq("id", voteItemId)
        .maybeSingle(),
      supabase.from("votes").select("value").eq("vote_item_id", voteItemId),
    ]);

    const typedVi = (vi ?? null) as VoteItemRow | null;
    setVoteItem(typedVi);

    if (typedVi?.motioner_allocation_id) {
      const { data: alloc } = await supabase
        .from("allocations")
        .select("country")
        .eq("id", typedVi.motioner_allocation_id)
        .maybeSingle();
      setMotionerCountry(alloc?.country?.trim() || null);
    } else {
      setMotionerCountry(null);
    }

    const v = (votes ?? []) as Array<{ value: "yes" | "no" | string }>;
    const counted = v.filter((x) => x.value === "yes" || x.value === "no");
    const yes = counted.filter((x) => x.value === "yes").length;
    const no = counted.filter((x) => x.value === "no").length;
    setTally({ yes, no, total: counted.length });
  }, [supabase, voteItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!voteItemId) return;

    const ch = supabase
      .channel(`motion-votes-${voteItemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `vote_item_id=eq.${voteItemId}`,
        },
        () => void load()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, voteItemId, load]);

  useEffect(() => {
    if (!voteItemId) return;
    const ch = supabase
      .channel(`motion-item-${voteItemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_items",
          filter: `id=eq.${voteItemId}`,
        },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, voteItemId, load]);

  const majorityLabel = (requiredMajority: string | null | undefined) =>
    requiredMajority === "2/3" ? "2/3" : t("majoritySimple");

  return (
    <div className="rounded-xl border border-white/15 bg-black/25 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-muted">{t("votingProcedure")}</p>
          <p className="font-semibold text-brand-navy truncate">
            {voteItem?.title?.trim()
              ? translateAgendaTopicLabel(tTopics, voteItem.title)
              : t("currentMotion")}
          </p>
          {voteItem?.description?.trim() ? (
            <p className="text-sm text-brand-navy/85 mt-1 line-clamp-4">{voteItem.description.trim()}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
            <span>
              {t("motioner")}: <span className="font-medium text-brand-navy/90">{motionerCountry || "—"}</span>
            </span>
            <span>
              {t("majority")}:{" "}
              <span className="font-medium text-brand-navy/90">
                {voteItem ? majorityLabel(voteItem.required_majority) : "—"}
              </span>
            </span>
          </div>
        </div>
        <p className="text-xs text-brand-muted shrink-0">
          {t("tally", { yes: tally.yes, no: tally.no, total: tally.total })}
        </p>
      </div>

      <p className="text-xs text-brand-muted leading-relaxed">
        {t("help")}
      </p>
    </div>
  );
}
