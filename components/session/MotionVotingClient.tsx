"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatVoteMajorityLabel } from "@/lib/format-vote-majority";

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
  const supabase = useMemo(() => createClient(), []);
  const [voteItem, setVoteItem] = useState<VoteItemRow | null>(null);
  const [motionerCountry, setMotionerCountry] = useState<string | null>(null);
  const [tally, setTally] = useState<VoteTally>({ yes: 0, no: 0, total: 0 });
  const [myVote, setMyVote] = useState<"yes" | "no" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (!voteItemId) {
      setVoteItem(null);
      setMotionerCountry(null);
      setTally({ yes: 0, no: 0, total: 0 });
      setMyVote(null);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

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
    const yes = v.filter((x) => x.value === "yes").length;
    const no = v.filter((x) => x.value === "no").length;
    setTally({ yes, no, total: v.length });

    if (userId) {
      const { data: myRow } = await supabase
        .from("votes")
        .select("value")
        .eq("vote_item_id", voteItemId)
        .eq("user_id", userId)
        .maybeSingle();
      const value = myRow?.value;
      if (value === "yes" || value === "no") setMyVote(value);
      else setMyVote(null);
    }
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

  async function cast(value: "yes" | "no") {
    setPending(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        return;
      }

      const { error: insErr } = await supabase.from("votes").upsert(
        { vote_item_id: voteItemId, user_id: user.id, value },
        { onConflict: "vote_item_id,user_id" }
      );
      if (insErr) throw insErr;
      setMyVote(value);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to vote.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  const isClosed = voteItem?.closed_at != null;

  return (
    <div className="rounded-xl border border-white/15 bg-black/25 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-brand-muted">Voting procedure</p>
          <p className="font-semibold text-brand-navy truncate">
            {voteItem?.title ?? "Current motion"}
          </p>
          {voteItem?.description?.trim() ? (
            <p className="text-sm text-brand-navy/85 mt-1 line-clamp-4">{voteItem.description.trim()}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
            <span>
              Motioner:{" "}
              <span className="font-medium text-brand-navy/90">{motionerCountry || "—"}</span>
            </span>
            <span>
              Majority:{" "}
              <span className="font-medium text-brand-navy/90">
                {voteItem ? formatVoteMajorityLabel(voteItem.required_majority) : "—"}
              </span>
            </span>
          </div>
        </div>
        <p className="text-xs text-brand-muted shrink-0">
          Yes {tally.yes} • No {tally.no} • Total {tally.total}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void cast("yes")}
          disabled={pending || isClosed}
          className={[
            "flex-1 px-3 py-2 rounded-lg text-sm font-medium",
            myVote === "yes" ? "bg-brand-gold text-brand-navy" : "bg-brand-paper border border-brand-navy/15",
            isClosed ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
          ].join(" ")}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => void cast("no")}
          disabled={pending || isClosed}
          className={[
            "flex-1 px-3 py-2 rounded-lg text-sm font-medium",
            myVote === "no" ? "bg-brand-gold text-brand-navy" : "bg-brand-paper border border-brand-navy/15",
            isClosed ? "opacity-60 cursor-not-allowed" : "hover:opacity-90",
          ].join(" ")}
        >
          No
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
