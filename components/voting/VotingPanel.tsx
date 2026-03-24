"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VoteItem } from "@/types/database";

interface Vote {
  value: string;
  user_id: string;
}

export function VotingPanel({ voteItems }: { voteItems: VoteItem[] }) {
  const [votes, setVotes] = useState<Record<string, Vote[]>>({});
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const supabase = createClient();

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
