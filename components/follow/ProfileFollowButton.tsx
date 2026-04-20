"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileFollowButton({
  userId,
  targetProfileId,
  initiallyFollowing,
}: {
  userId: string;
  targetProfileId: string;
  initiallyFollowing: boolean;
}) {
  const supabase = createClient();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFollow() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (following) {
        const { error: delErr } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("followed_id", targetProfileId);
        if (delErr) throw delErr;
        setFollowing(false);
      } else {
        const { error: insErr } = await supabase.from("follows").insert({
          follower_id: userId,
          followed_id: targetProfileId,
        });
        if (insErr) throw insErr;
        setFollowing(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update follow state.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void toggleFollow()}
        disabled={pending}
        className={[
          "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
          following
            ? "border-brand-accent/40 bg-brand-accent/12 text-brand-navy dark:text-zinc-100"
            : "border-brand-accent/35 bg-white text-brand-navy hover:bg-brand-accent/10 dark:bg-black/20 dark:text-zinc-100",
        ].join(" ")}
      >
        {pending ? "Working…" : following ? "Following" : "Follow"}
      </button>
      {error ? (
        <p className="text-xs text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
