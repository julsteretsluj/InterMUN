"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type VoteItemRow = {
  id: string;
  vote_type: "motion" | "amendment" | "resolution" | string;
  title: string | null;
  must_vote: boolean;
  required_majority: string;
  closed_at: string | null;
};

type VoteTally = {
  yes: number;
  no: number;
  total: number;
};

export function MotionVotingClient({
  voteItemId,
}: {
  voteItemId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [voteItem, setVoteItem] = useState<VoteItemRow | null>(null);
  const [tally, setTally] = useState<VoteTally>({ yes: 0, no: 0, total: 0 });
  const [myVote, setMyVote] = useState<"yes" | "no" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (!voteItemId) {
      setVoteItem(null);
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
        .select("id, vote_type, title, must_vote, required_majority, closed_at")
        .eq("id", voteItemId)
        .maybeSingle(),
      supabase
        .from("votes")
        .select("value")
        .eq("vote_item_id", voteItemId),
    ]);

    const typedVi = (vi ?? null) as VoteItemRow | null;
    setVoteItem(typedVi);

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
    <div className="rounded-xl border border-brand-navy/10 bg-white/60 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-muted">Voting procedure</p>
          <p className="font-semibold text-brand-navy truncate">
            {voteItem?.title ?? "Current motion"}
          </p>
        </div>
        <p className="text-xs text-brand-muted">
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

