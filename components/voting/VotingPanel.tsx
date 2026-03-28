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

  async function castVote(itemId: string, value: "yes" | "no") {
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

  function getResult(item: VoteItem) {
    const v = votes[item.id] || [];
    const yes = v.filter((x) => x.value === "yes").length;
    const no = v.filter((x) => x.value === "no").length;
    const total = v.length;
    const majority = item.required_majority === "2/3" ? (total * 2) / 3 : total / 2;
    const passes = yes > majority;
    return { yes, no, total, passes };
  }

  const openItems = voteItems.filter((i) => !i.closed_at);
  const closedItems = voteItems.filter((i) => !!i.closed_at);

  function renderVoteCard(item: VoteItem) {
    const { yes, no, total, passes } = getResult(item);
    const d = drafts[item.id] || { must_vote: item.must_vote, required_majority: item.required_majority };
    const isClosed = !!item.closed_at;

    return (
      <div
        key={item.id}
        className={`border rounded-lg p-4 dark:border-slate-700 ${isClosed ? "opacity-85" : ""}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-medium capitalize">{item.vote_type}</span>
            {item.title && <span className="ml-2">- {item.title}</span>}
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
          Majority required:{" "}
          {item.required_majority === "simple" ? "Simple" : item.required_majority}
        </p>

        <div className="flex gap-2 mb-3">
          {(["yes", "no"] as const).map((val) => (
            <button
              key={val}
              onClick={() => castVote(item.id, val)}
              disabled={!canCastVotes || isClosed}
              className={`px-3 py-1 rounded text-sm ${
                myVotes[item.id] === val
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
              } ${isClosed ? "opacity-60 cursor-not-allowed" : ""}`}
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
                      [item.id]: { ...d, required_majority: e.target.value },
                    }))
                  }
                  className="ml-2 px-2 py-1 rounded border dark:bg-slate-700"
                >
                  <option value="simple">Simple</option>
                  <option value="2/3">2/3</option>
                </select>
              </label>
              <button
                type="button"
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                onClick={() => void saveSettings(item.id, d.must_vote, d.required_majority)}
              >
                Save settings
              </button>
            </div>
            <div className="flex gap-2">
              {isClosed ? (
                <button
                  type="button"
                  className="px-3 py-1 rounded border dark:border-slate-600 text-sm"
                  onClick={() => void setClosed(item.id, false)}
                >
                  Reopen
                </button>
              ) : (
                <button
                  type="button"
                  className="px-3 py-1 rounded border border-red-400/40 text-red-700 dark:text-red-200 dark:border-red-500/40 text-sm"
                  onClick={() => void setClosed(item.id, true)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        ) : null}

        <div className="text-sm">
          Yes: {yes} | No: {no} | Total: {total}
        </div>
        <div
          className={`mt-2 font-semibold ${
            passes ? "text-green-600" : "text-red-600"
          }`}
        >
          {total > 0 ? (passes ? "PASSES" : "FAILS") : "-"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {voteItems.length === 0 ? (
        <p className="text-slate-500">No motions yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Current open motion</p>
            {openItems.length > 0 ? openItems.map(renderVoteCard) : (
              <p className="text-slate-500">No open motion right now.</p>
            )}
          </div>
          {closedItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent closed motions</p>
              {closedItems.map(renderVoteCard)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
