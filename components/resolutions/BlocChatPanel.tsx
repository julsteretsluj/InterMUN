// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { shouldAutoHoldNote } from "@/lib/note-moderation";
import { cn } from "@/lib/utils";

export type BlocMemberLabel = {
  userId: string;
  country: string;
};

type BlocMessageRow = {
  id: string;
  bloc_id: string;
  conference_id: string;
  sender_user_id: string;
  sender_allocation_id: string | null;
  content: string;
  moderation_state: "approved" | "held" | "rejected";
  created_at: string;
};

export function BlocChatPanel({
  blocId,
  blocName,
  conferenceId,
  myUserId,
  myAllocationId,
  memberLabels,
  canModerate,
  isMember,
  sessionActive = true,
}: {
  blocId: string;
  blocName: string;
  conferenceId: string;
  myUserId: string;
  myAllocationId: string | null;
  memberLabels: BlocMemberLabel[];
  canModerate: boolean;
  isMember: boolean;
  sessionActive?: boolean;
}) {
  const t = useTranslations("blocChat");
  const supabase = createClient();
  const [messages, setMessages] = useState<BlocMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const labelByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of memberLabels) map.set(m.userId, m.country);
    return map;
  }, [memberLabels]);

  const senderLabel = useCallback(
    (userId: string) => {
      if (userId === myUserId) return t("youLabel");
      return labelByUserId.get(userId) ?? t("delegationFallback");
    },
    [labelByUserId, myUserId, t]
  );

  const loadMessages = useCallback(async () => {
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from("bloc_messages")
      .select(
        "id, bloc_id, conference_id, sender_user_id, sender_allocation_id, content, moderation_state, created_at"
      )
      .eq("bloc_id", blocId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }
    setMessages((data ?? []) as BlocMessageRow[]);
    setLoading(false);
  }, [blocId, supabase]);

  useEffect(() => {
    // Deferred to a microtask so state lands asynchronously (no sync cascade).
    void Promise.resolve().then(loadMessages);
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`bloc-messages-${blocId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bloc_messages", filter: `bloc_id=eq.${blocId}` },
        () => {
          void loadMessages();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [blocId, loadMessages, supabase]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    const trimmed = draft.trim();
    if (!trimmed || !isMember) return;
    if (!sessionActive) {
      setError(t("sessionInactive"));
      return;
    }
    setError(null);
    setSending(true);
    const held = shouldAutoHoldNote({ content: trimmed, concernFlag: false });
    const { error: insertErr } = await supabase.from("bloc_messages").insert({
      bloc_id: blocId,
      conference_id: conferenceId,
      sender_user_id: myUserId,
      sender_allocation_id: myAllocationId,
      content: trimmed,
      moderation_state: held ? "held" : "approved",
    });
    setSending(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setDraft("");
    if (held) setError(t("heldPending"));
    await loadMessages();
  }

  async function moderateMessage(id: string, state: "approved" | "rejected") {
    if (!canModerate) return;
    setError(null);
    const { error: updateErr } = await supabase
      .from("bloc_messages")
      .update({ moderation_state: state })
      .eq("id", id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    await loadMessages();
  }

  if (!isMember && !canModerate) return null;

  const visibleMessages = canModerate
    ? messages
    : messages.filter((m) => m.moderation_state === "approved");

  return (
    <div className="space-y-2 rounded-lg border border-[var(--hairline)] bg-[var(--material-thin)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-brand-navy">{t("title", { bloc: blocName })}</h4>
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
          {t("live")}
        </span>
      </div>
      <p className="text-xs text-brand-muted">{t("help")}</p>

      <ul
        ref={listRef}
        className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[var(--hairline)] bg-white/70 p-2 dark:bg-black/20"
        aria-live="polite"
      >
        {loading ? (
          <li className="text-xs text-brand-muted">{t("loading")}</li>
        ) : visibleMessages.length === 0 ? (
          <li className="text-xs text-brand-muted">{t("empty")}</li>
        ) : (
          visibleMessages.map((msg) => {
            const mine = msg.sender_user_id === myUserId;
            return (
              <li
                key={msg.id}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  mine
                    ? "ml-6 bg-[color-mix(in_srgb,var(--accent)_12%,#ffffff)] text-brand-navy"
                    : "mr-6 border border-[var(--hairline)] bg-brand-paper/80 text-brand-navy"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-brand-muted">{senderLabel(msg.sender_user_id)}</p>
                  {canModerate && msg.moderation_state === "held" ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 dark:text-amber-200">
                      {t("heldBadge")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap">{msg.content}</p>
                {canModerate && msg.moderation_state === "held" ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void moderateMessage(msg.id, "approved")}
                      className="text-xs font-medium text-brand-diplomatic hover:underline"
                    >
                      {t("approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void moderateMessage(msg.id, "rejected")}
                      className="text-xs font-medium text-red-700 hover:underline dark:text-red-300"
                    >
                      {t("reject")}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      {isMember ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            disabled={!sessionActive || sending}
            placeholder={t("messagePlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted disabled:opacity-50 dark:bg-black/20"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!sessionActive || sending || !draft.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-2 text-white disabled:opacity-50"
            aria-label={t("send")}
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <p className="text-xs text-brand-muted">{t("chairViewOnly")}</p>
      )}

      {error ? (
        <p className="text-xs text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
