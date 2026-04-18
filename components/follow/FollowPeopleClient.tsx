"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LookupMode = "username" | "id";

type ResolvedProfile = {
  profile_id: string;
  username: string | null;
  name: string | null;
  pronouns: string | null;
  school: string | null;
  role: string;
  profile_picture_url: string | null;
};

type FollowingRow = {
  followed_id: string;
  username: string | null;
  name: string | null;
  pronouns: string | null;
  school: string | null;
  role: string;
  profile_picture_url: string | null;
  followed_created_at: string;
};

function looksLikeUuid(v: string) {
  // Fast client-side check to prevent obvious RPC failures.
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    v.trim()
  );
}

export function FollowPeopleClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [mode, setMode] = useState<LookupMode>("username");
  const [lookupValue, setLookupValue] = useState("");
  const [following, setFollowing] = useState<FollowingRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const placeholder = useMemo(() => {
    return mode === "username" ? "e.g. alex_1999" : "e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6";
  }, [mode]);

  async function refreshFollowing() {
    const { data, error: rpcErr } = await supabase.rpc("get_my_following", {
      p_follower_id: userId,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setFollowing((data ?? []) as FollowingRow[]);
  }

  useEffect(() => {
    void refreshFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFollow() {
    setError(null);
    setMessage(null);
    const v = lookupValue.trim();
    if (!v) {
      setError("Enter a username or profile id.");
      return;
    }

    if (mode === "id" && !looksLikeUuid(v)) {
      setError("That does not look like a valid UUID.");
      return;
    }

    setPending(true);
    try {
      const { data: resolved, error: rpcErr } = await supabase.rpc("resolve_profile_exact", {
        p_username: mode === "username" ? v : null,
        p_profile_id: mode === "id" ? v : null,
      });

      if (rpcErr) throw rpcErr;

      const target = (resolved ?? [])[0] as ResolvedProfile | undefined;
      if (!target) {
        setError("No user found for that exact username/id.");
        return;
      }
      if (target.profile_id === userId) {
        setError("You can’t follow yourself.");
        return;
      }

      const { data: existing } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId)
        .eq("followed_id", target.profile_id)
        .limit(1);

      if ((existing ?? []).length > 0) {
        setMessage("You’re already following this person.");
        return;
      }

      const { error: insErr } = await supabase.from("follows").insert({
        follower_id: userId,
        followed_id: target.profile_id,
      });
      if (insErr) throw insErr;

      setMessage("Followed.");
      setLookupValue("");
      await refreshFollowing();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not follow.");
    } finally {
      setPending(false);
    }
  }

  async function onUnfollow(followedId: string) {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const { error: delErr } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("followed_id", followedId);
      if (delErr) throw delErr;
      setMessage("Unfollowed.");
      await refreshFollowing();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unfollow.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Follow people</h2>
        <p className="text-sm text-brand-muted max-w-2xl">
          Choose a mode and enter the exact <span className="font-mono">username</span> or{" "}
          <span className="font-mono">profile id</span>. Partial matches are not supported.
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="lookup_mode"
              checked={mode === "username"}
              onChange={() => setMode("username")}
            />
            Username (exact)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="lookup_mode"
              checked={mode === "id"}
              onChange={() => setMode("id")}
            />
            Profile id (exact)
          </label>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex-1 min-w-[240px]">
            <span className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1">
              {mode === "username" ? "Username" : "Profile id"}
            </span>
            <input
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              placeholder={placeholder}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-brand-navy/15"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={onFollow}
            className="px-4 py-2 rounded-lg bg-brand-paper text-brand-navy text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Working…" : "Follow"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Following</h2>
        {following.length === 0 ? (
          <p className="text-sm text-brand-muted">You’re not following anyone yet.</p>
        ) : (
          <ul className="divide-y divide-brand-navy/10">
            {following.map((f) => (
              <li key={f.followed_id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {f.profile_picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.profile_picture_url}
                        alt={`${f.name ?? f.username ?? "User"} avatar`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium text-brand-navy truncate">
                        {f.name?.trim() ? f.name : f.username ? `@${f.username}` : "—"}
                      </div>
                      <div className="text-xs text-brand-muted truncate">
                        {f.username ? `@${f.username}` : f.school?.trim() ? f.school : " "}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onUnfollow(f.followed_id)}
                  className="text-xs text-red-700 hover:underline disabled:opacity-50 shrink-0"
                >
                  Unfollow
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

