"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VoteItem } from "@/types/database";

interface Vote {
  value: string;
  user_id: string;
}

export function VotingPanel({
  voteItems,
  myRole,
}: {
  voteItems: VoteItem[];
  myRole: string;
}) {
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, { must_vote: boolean; required_majority: string }>>({});
  const supabase = createClient();

  const canCastVotes = myRole === "delegate";
  const canManageVotes = myRole === "chair";

  // Keep draft state aligned with incoming items.
  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        voteItems.map((item) => [
          item.id,
          { must_vote: item.must_vote, required_majority: item.required_majority },
        ])
      )
    );
  }, [voteItems]);

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

  async function castVote(itemId: string, value: "yes" | "no" | "abstain") {
    if (!canCastVotes) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("votes").upsert(
      { vote_item_id: itemId, user_id: user.id, value },
      { onConflict: "vote_item_id,user_id" }
    );
    setMyVotes((v) => ({ ...v, [itemId]: value }));
  }

  function getResult(item: VoteItem) {
    const v = votes[item.id] || [];
    const yes = v.filter((x) => x.value === "yes").length;
    const no = v.filter((x) => x.value === "no").length;
    const abstain = v.filter((x) => x.value === "abstain").length;
    const total = v.length;
    const majority = item.required_majority === "2/3" ? (total * 2) / 3 : total / 2;
    const passes = yes > majority;
    return { yes, no, abstain, total, passes };
  }

  return (
    <div className="space-y-4">
      {voteItems.length === 0 ? (
        <p className="text-slate-500">No active votes</p>
      ) : (
        voteItems.map((item) => {
          const { yes, no, abstain, total, passes } = getResult(item);
          const d = drafts[item.id] || { must_vote: item.must_vote, required_majority: item.required_majority };
          return (
            <div
              key={item.id}
              className="border rounded-lg p-4 dark:border-slate-700"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium capitalize">{item.vote_type}</span>
                  {item.title && <span className="ml-2">– {item.title}</span>}
                </div>
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    item.must_vote ? "bg-amber-100 dark:bg-amber-900" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {item.must_vote ? "MUST vote" : "CAN vote"}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Majority required: {item.required_majority}
              </p>
              <div className="flex gap-2 mb-3">
                {(["yes", "no", "abstain"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => castVote(item.id, val)}
                    disabled={!canCastVotes}
                    className={`px-3 py-1 rounded text-sm ${
                      myVotes[item.id] === val
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                  </button>
                ))}
              </div>

              {canManageVotes ? (
                <div className="mt-3 p-3 border rounded dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={d.must_vote}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...d, must_vote: e.target.checked },
                          }))
                        }
                      />
                      MUST vote
                    </label>
                    <label className="text-sm">
                      Required majority
                      <select
                        value={d.required_majority}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...d,
                              required_majority: e.target.value,
                            },
                          }))
                        }
                        className="ml-2 px-2 py-1 rounded border dark:bg-slate-700"
                      >
                        <option value="simple">simple</option>
                        <option value="2/3">2/3</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("vote_items")
                          .update({
                            must_vote: d.must_vote,
                            required_majority: d.required_majority,
                          })
                          .eq("id", item.id);
                        if (error) return;
                        // Refresh votes list.
                        // Server will usually re-run, but keep it simple for now.
                        setDrafts((prev) => ({ ...prev, [item.id]: d }));
                      }}
                    >
                      Save settings
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {item.closed_at ? (
                      <button
                        type="button"
                        className="px-3 py-1 rounded border dark:border-slate-600 text-sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from("vote_items")
                            .update({ closed_at: null })
                            .eq("id", item.id);
                          if (error) return;
                          location.reload();
                        }}
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1 rounded border border-red-400/40 text-red-700 dark:text-red-200 dark:border-red-500/40 text-sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from("vote_items")
                            .update({ closed_at: new Date().toISOString() })
                            .eq("id", item.id);
                          if (error) return;
                          location.reload();
                        }}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="text-sm">
                Yes: {yes} | No: {no} | Abstain: {abstain} | Total: {total}
              </div>
              <div
                className={`mt-2 font-semibold ${
                  passes ? "text-green-600" : "text-red-600"
                }`}
              >
                {total > 0 ? (passes ? "PASSES" : "FAILS") : "—"}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
