"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Megaphone, ListOrdered } from "lucide-react";

type Announcement = { id: string; body: string; created_at: string };
type QueueRow = {
  id: string;
  sort_order: number;
  label: string | null;
  status: string;
  allocation_id: string | null;
  allocations: { country: string } | { country: string }[] | null;
};

function allocCountry(
  a: QueueRow["allocations"]
): string | null {
  if (!a) return null;
  const row = Array.isArray(a) ? a[0] : a;
  return row?.country?.trim() || null;
}

export function FloorStatusBar({ conferenceId }: { conferenceId: string }) {
  const supabase = createClient();
  const [latestDais, setLatestDais] = useState<Announcement | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [rollSelf, setRollSelf] = useState<string | null>(null);

  const loadQueue = useCallback(() => {
    return supabase
      .from("speaker_queue_entries")
      .select("id, sort_order, label, status, allocation_id, allocations(country)")
      .eq("conference_id", conferenceId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setQueue((data as QueueRow[]) ?? []));
  }, [supabase, conferenceId]);

  useEffect(() => {
    void supabase
      .from("dais_announcements")
      .select("id, body, created_at")
      .eq("conference_id", conferenceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data && setLatestDais(data));

    void loadQueue();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: alloc } = await supabase
        .from("allocations")
        .select("id")
        .eq("conference_id", conferenceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alloc?.id) return;
      const { data: rc } = await supabase
        .from("roll_call_entries")
        .select("present")
        .eq("conference_id", conferenceId)
        .eq("allocation_id", alloc.id)
        .maybeSingle();
      if (rc) {
        setRollSelf(rc.present ? "Present" : "Not marked present");
      }
    })();
  }, [supabase, conferenceId, loadQueue]);

  useEffect(() => {
    const ch = supabase
      .channel(`floor-dais-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dais_announcements",
          filter: `conference_id=eq.${conferenceId}`,
        },
        (payload) => {
          const row = payload.new as Announcement;
          setLatestDais(row);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId]);

  useEffect(() => {
    const ch = supabase
      .channel(`floor-queue-${conferenceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "speaker_queue_entries" },
        () => void loadQueue()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, conferenceId, loadQueue]);

  const displayQueue = queue.filter((q) => q.status !== "done").slice(0, 8);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-brand-paper text-sm space-y-2">
      {latestDais && (
        <div className="flex gap-2 items-start">
          <Megaphone className="w-4 h-4 text-brand-gold-bright shrink-0 mt-0.5" />
          <div>
            <span className="text-[0.65rem] uppercase tracking-wider text-brand-paper/55 block">
              Dais
            </span>
            <p className="text-brand-paper/95">{latestDais.body}</p>
          </div>
        </div>
      )}
      {displayQueue.length > 0 && (
        <div className="flex gap-2 items-start pt-1 border-t border-white/10">
          <ListOrdered className="w-4 h-4 text-brand-gold-bright shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[0.65rem] uppercase tracking-wider text-brand-paper/55 block mb-0.5">
              Speakers
            </span>
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-brand-paper/90">
              {displayQueue.map((q) => (
                <li key={q.id} className="font-medium">
                  <span
                    className={
                      q.status === "current" ? "text-brand-gold-bright" : undefined
                    }
                  >
                    {q.label || allocCountry(q.allocations) || "Speaker"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {rollSelf && (
        <p className="text-[0.65rem] text-brand-paper/70 pt-1 border-t border-white/10">
          Roll call (you): <span className="font-medium text-brand-paper">{rollSelf}</span>
        </p>
      )}
    </div>
  );
}
