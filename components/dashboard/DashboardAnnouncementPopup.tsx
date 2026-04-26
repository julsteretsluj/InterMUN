"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PopupNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string;
  created_at: string;
  read_at: string | null;
};

const SUPPORTED_TYPES = new Set(["committee_broadcast", "smt_broadcast", "dais_announcement"]);

export function DashboardAnnouncementPopup() {
  const supabase = createClient();
  const [notification, setNotification] = useState<PopupNotification | null>(null);
  const loadingRef = useRef(false);

  const shouldShow = useMemo(
    () => Boolean(notification && SUPPORTED_TYPES.has(notification.type)),
    [notification]
  );

  const loadLatestUnread = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_notifications")
        .select("id, type, title, body, href, created_at, read_at")
        .eq("user_id", user.id)
        .is("read_at", null)
        .in("type", Array.from(SUPPORTED_TYPES))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setNotification((data as PopupNotification | null) ?? null);
    } finally {
      loadingRef.current = false;
    }
  }, [supabase]);

  const markRead = useCallback(
    async (id: string) => {
      await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      await loadLatestUnread();
    },
    [supabase, loadLatestUnread]
  );

  useEffect(() => {
    void loadLatestUnread();
  }, [loadLatestUnread]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel(`dashboard-announcement-popup-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as PopupNotification;
            if (!SUPPORTED_TYPES.has(row.type)) return;
            setNotification(row);
          }
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!shouldShow || !notification) return null;

  return (
    <div className="border-b border-brand-accent/30 bg-brand-accent/12 px-4 py-2 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start justify-between gap-3 text-sm text-brand-navy">
        <div className="min-w-0">
          <p className="font-semibold">{notification.title}</p>
          {notification.body ? <p className="line-clamp-2 text-brand-navy/85">{notification.body}</p> : null}
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <a
            href={notification.href.startsWith("/") ? notification.href : `/${notification.href}`}
            className="text-brand-accent underline hover:no-underline"
            onClick={() => void markRead(notification.id)}
          >
            Open
          </a>
          <button
            type="button"
            className="text-brand-navy/80 underline hover:no-underline"
            onClick={() => void markRead(notification.id)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
