"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, MessageSquare, X } from "lucide-react";
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

const SUPPORTED_TYPES = new Set([
  "committee_broadcast",
  "smt_broadcast",
  "dais_announcement",
  "delegation_note",
]);

const AUTO_DISMISS_MS = 6500;
const LEAVE_MS = 340;

function iconForType(type: string) {
  if (type === "delegation_note") return MessageSquare;
  return Megaphone;
}

export function DashboardAnnouncementPopup() {
  const supabase = createClient();
  const [current, setCurrent] = useState<PopupNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const loadingRef = useRef(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterRaf = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (enterRaf.current) cancelAnimationFrame(enterRaf.current);
    autoTimer.current = null;
    leaveTimer.current = null;
    enterRaf.current = null;
  }, []);

  const scheduleAutoDismiss = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => {
      setVisible(false);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => setCurrent(null), LEAVE_MS);
    }, AUTO_DISMISS_MS);
  }, []);

  const present = useCallback(
    (n: PopupNotification | null) => {
      clearTimers();
      if (!n || !SUPPORTED_TYPES.has(n.type)) {
        setVisible(false);
        leaveTimer.current = setTimeout(() => setCurrent(null), LEAVE_MS);
        return;
      }
      setCurrent(n);
      setVisible(false);
      // Two frames so the entrance transition runs from the hidden state.
      enterRaf.current = requestAnimationFrame(() => {
        enterRaf.current = requestAnimationFrame(() => setVisible(true));
      });
      scheduleAutoDismiss();
    },
    [clearTimers, scheduleAutoDismiss]
  );

  const dismiss = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setVisible(false);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setCurrent(null), LEAVE_MS);
  }, []);

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
      present((data as PopupNotification | null) ?? null);
    } finally {
      loadingRef.current = false;
    }
  }, [supabase, present]);

  const markRead = useCallback(
    async (id: string) => {
      dismiss();
      if (!id.startsWith("local-")) {
        await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      }
    },
    [supabase, dismiss]
  );

  useEffect(() => {
    void loadLatestUnread();
  }, [loadLatestUnread]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const onLocalPopup = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; body?: string; href?: string }>).detail;
      if (!detail?.title) return;
      present({
        id: `local-${Date.now()}`,
        type: "delegation_note",
        title: detail.title,
        body: detail.body ?? null,
        href: detail.href ?? "/chats-notes",
        created_at: new Date().toISOString(),
        read_at: null,
      });
    };
    window.addEventListener("intermun:delegation-note-popup", onLocalPopup);
    return () => window.removeEventListener("intermun:delegation-note-popup", onLocalPopup);
  }, [present]);

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
            present(row);
          }
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, present]);

  if (!current) return null;

  const Icon = iconForType(current.type);
  const href = current.href.startsWith("/") ? current.href : `/${current.href}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex justify-center px-3 sm:inset-x-auto sm:right-4 sm:justify-end sm:px-0">
      <div
        role="alert"
        onMouseEnter={() => {
          if (autoTimer.current) clearTimeout(autoTimer.current);
        }}
        onMouseLeave={scheduleAutoDismiss}
        className={[
          "pointer-events-auto w-[min(26rem,calc(100vw-1.5rem))] origin-top will-change-transform",
          "rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-[var(--material-popover)]",
          "shadow-[0_20px_56px_-18px_rgba(0,0,0,0.5)] backdrop-blur-2xl",
          "transition-[transform,opacity] duration-[var(--dur-slow,320ms)] ease-[var(--ease-apple-out)]",
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-[135%] scale-[0.96] opacity-0",
        ].join(" ")}
      >
        <a
          href={href}
          onClick={() => void markRead(current.id)}
          className="flex items-start gap-3 rounded-[var(--radius-xl)] p-3.5 pr-2.5 text-brand-navy transition-apple hover:bg-[color:var(--discord-hover-bg)]"
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-brand-accent dark:text-brand-accent-bright">
            <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-sm font-semibold leading-tight">{current.title}</p>
            {current.body ? (
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-brand-navy/75 dark:text-zinc-300/80">
                {current.body}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void markRead(current.id);
            }}
            className="-mr-0.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-navy/50 transition-apple hover:bg-[color:var(--discord-hover-bg)] hover:text-brand-navy"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </a>
      </div>
    </div>
  );
}
