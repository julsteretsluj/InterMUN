"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { CHAIR_MOTIONS_POINTS_PRESETS } from "@/lib/chair-motions-points-presets";
import { createClient } from "@/lib/supabase/client";

type DelegateOption = {
  allocationId: string;
  label: string;
};

export type DelegatePointEntry = {
  id: string;
  allocationId: string;
  delegateLabel: string;
  text: string;
  starred: boolean;
  createdAt: string;
};

export function ChairMotionsPointsLog({
  conferenceId,
  delegateOptions,
}: {
  conferenceId: string;
  delegateOptions: DelegateOption[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<DelegatePointEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState("");
  const [draft, setDraft] = useState("");
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const pointsPresets = useMemo(
    () => CHAIR_MOTIONS_POINTS_PRESETS.filter((p) => p.kind === "point"),
    []
  );

  const loadPoints = useCallback(async () => {
    const { data, error } = await supabase
      .from("chair_delegate_points")
      .select("id, allocation_id, point_text, starred, created_at, allocations(country)")
      .eq("conference_id", conferenceId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      setReady(true);
      return;
    }
    type Row = {
      id: string;
      allocation_id: string;
      point_text: string;
      starred: boolean;
      created_at: string;
      allocations: { country: string | null } | { country: string | null }[] | null;
    };
    const rows = (data ?? []) as Row[];
    const mapped: DelegatePointEntry[] = rows.map((r) => {
      const alloc = Array.isArray(r.allocations) ? r.allocations[0] : r.allocations;
      const country = alloc?.country?.trim() || "Delegate";
      return {
        id: r.id,
        allocationId: r.allocation_id,
        delegateLabel: country,
        text: r.point_text,
        starred: r.starred === true,
        createdAt: r.created_at,
      };
    });
    setEntries(mapped);
    setReady(true);
  }, [conferenceId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPoints();
  }, [loadPoints]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setMyUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    const ch = supabase
      .channel(`chair-delegate-points-${conferenceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chair_delegate_points" },
        () => void loadPoints()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conferenceId, loadPoints, supabase]);

  const addEntry = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !selectedAllocationId || !myUserId) return;
      const { error } = await supabase.from("chair_delegate_points").insert({
        conference_id: conferenceId,
        chair_user_id: myUserId,
        allocation_id: selectedAllocationId,
        point_text: t,
        starred: false,
      });
      if (!error) setDraft("");
    },
    [conferenceId, myUserId, selectedAllocationId, supabase]
  );

  const add = useCallback(() => {
    void addEntry(draft);
  }, [addEntry, draft]);

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("chair_delegate_points").delete().eq("id", id);
    },
    [supabase]
  );

  const toggleStar = useCallback(
    async (entry: DelegatePointEntry) => {
      await supabase.from("chair_delegate_points").update({ starred: !entry.starred }).eq("id", entry.id);
    },
    [supabase]
  );

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt)
      ),
    [entries]
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Record and star points for delegates. Entries are saved to each delegate account/profile and are visible only
        to that delegate plus committee chair/SMT.
      </p>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
        <p className="font-medium">Points log (account-synced)</p>
        <p className="mt-1 text-amber-900/85 dark:text-amber-200/90">
          Formal procedural votes and the motion floor are in{" "}
          <Link
            href="/chair/session/motions"
            className="font-semibold underline decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-400"
          >
            Formal motions
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Delegate
          <select
            value={selectedAllocationId}
            onChange={(e) => setSelectedAllocationId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Select delegate…</option>
            {delegateOptions.map((d) => (
              <option key={d.allocationId} value={d.allocationId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Text
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="e.g. Motion to open the speaker list"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || !selectedAllocationId || !myUserId}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-brand-accent dark:hover:opacity-90"
          >
            ➕ Add
          </button>
        </div>

        <details className="mt-4 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 dark:border-zinc-600 dark:bg-zinc-800/40">
          <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-zinc-200">
            Preset options
          </summary>
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
            Tap a preset to add a point for the selected delegate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pointsPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void addEntry(p.logText)}
                disabled={!selectedAllocationId || !myUserId}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-slate-800 hover:border-brand-accent/35 hover:bg-brand-accent/8 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-brand-accent/40 dark:hover:bg-brand-accent/12"
              >
                {p.buttonLabel}
              </button>
            ))}
          </div>
        </details>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">📋 Log</h3>
        {!ready ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">No entries yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sorted.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <button
                  type="button"
                  onClick={() => void toggleStar(e)}
                  className="mt-0.5 shrink-0 text-amber-500 hover:text-amber-600 dark:text-amber-400"
                  aria-label={e.starred ? "Unstar" : "Star"}
                >
                  <Star className={`h-4 w-4 ${e.starred ? "fill-current" : ""}`} strokeWidth={1.75} />
                </button>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    Point · {e.delegateLabel}
                  </span>
                  <p className="text-slate-900 dark:text-zinc-100">{e.text}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(e.id)}
                  className="shrink-0 text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
