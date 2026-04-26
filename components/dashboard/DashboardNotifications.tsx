"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type UserNotificationRow = {
  id: string;
  user_id: string;
  conference_id: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string;
  reference_id: string | null;
  created_at: string;
  read_at: string | null;
};

function formatNotifTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardNotifications({ initialUnreadCount = 0 }: { initialUnreadCount?: number }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [items, setItems] = useState<UserNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const refreshUnreadCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { count, error } = await supabase
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (!error && count != null) setUnread(count);
  }, [supabase]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    setLoading(false);
    if (error) {
      setLoadError(error.message.includes("does not exist") ? "Notifications are not set up yet." : error.message);
      setItems([]);
      return;
    }
    setItems((data ?? []) as UserNotificationRow[]);
  }, [supabase]);

  useEffect(() => {
    setUnread(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    void loadItems();
  }, [open, loadItems]);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ch = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refreshUnreadCount();
            if (openRef.current) void loadItems();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refreshUnreadCount();
            if (openRef.current) void loadItems();
          }
        )
        .subscribe();
      if (cancelled) {
        supabase.removeChannel(ch);
        return;
      }
      realtimeChannelRef.current = ch;
    })();
    return () => {
      cancelled = true;
      const ch = realtimeChannelRef.current;
      realtimeChannelRef.current = null;
      if (ch) supabase.removeChannel(ch);
    };
  }, [supabase, refreshUnreadCount, loadItems]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markRead(id: string) {
    await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    void refreshUnreadCount();
  }

  async function markAllRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnread(0);
  }

  async function onItemActivate(n: UserNotificationRow) {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    router.push(n.href.startsWith("/") ? n.href : `/${n.href}`);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-brand-navy transition-apple hover:bg-[color:var(--discord-hover-bg)] sm:h-9 sm:w-9"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="mun-popover absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(100vw-2rem,22rem)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
            <p className="text-sm font-semibold text-brand-navy">Notifications</p>
            {items.some((n) => !n.read_at) ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-brand-accent hover:underline dark:text-brand-accent-bright"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(24rem,50vh)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-brand-muted">Loading…</p>
            ) : loadError ? (
              <p className="px-4 py-6 text-center text-sm text-amber-700 dark:text-amber-300/90">{loadError}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-brand-muted">
                No notifications yet. You will see delegation notes, announcements, and resolution sign
                requests here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void onItemActivate(n)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-apple hover:bg-[color:var(--discord-hover-bg)]",
                        !n.read_at && "bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] dark:bg-[color:color-mix(in_srgb,var(--accent)_14%,transparent)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-brand-navy dark:text-zinc-100">{n.title}</span>
                        <span className="shrink-0 text-[0.65rem] text-brand-muted">
                          {formatNotifTime(n.created_at)}
                        </span>
                      </div>
                      {n.body ? (
                        <p className="line-clamp-2 text-xs text-brand-navy/80 dark:text-zinc-400">{n.body}</p>
                      ) : null}
                      <span className="text-[0.65rem] font-medium text-brand-accent dark:text-brand-accent-bright">
                        Open →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-[var(--hairline)] px-4 py-2">
            <Link
              href="/chats-notes"
              className="text-xs font-medium text-brand-muted transition-apple hover:text-brand-accent"
              onClick={() => setOpen(false)}
            >
              Go to Notes
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
