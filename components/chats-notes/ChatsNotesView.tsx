"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmojiQuickInsert } from "@/components/EmojiQuickInsert";

type ChatMessage = {
  id: string;
  conference_id: string;
  sender_id: string;
  sender_role: string;
  kind: "personal" | "broadcast";
  audience_scope: "self" | "committee_all" | "all_committees";
  content: string;
  created_at: string;
  updated_at: string;
};

export function ChatsNotesView({
  initialMessages,
  conferenceId,
  myUserId,
  myRole,
}: {
  initialMessages: ChatMessage[];
  conferenceId: string;
  myUserId: string;
  myRole: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [mode, setMode] = useState<"personal" | "broadcast">("personal");
  const [broadcastScope, setBroadcastScope] = useState<"committee_all" | "all_committees">(
    "committee_all"
  );

  const supabase = createClient();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    const ch = supabase
      .channel(`chat-messages-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => {
          void refreshMessages();
        }
      );
    ch.subscribe();
    channelRef.current = ch;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, conferenceId]);

  const canBroadcast = myRole === "chair" || myRole === "smt" || myRole === "admin";
  const canEditAny = myRole === "smt" || myRole === "admin";
  const canChooseBroadcastScope = myRole === "smt" || myRole === "admin";

  useEffect(() => {
    if (!canBroadcast && mode !== "personal") setMode("personal");
  }, [canBroadcast, mode]);

  async function refreshMessages() {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conference_id", conferenceId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setMessages(data as ChatMessage[]);
  }

  async function submitMessage() {
    if (!newMessage.trim()) return;

    const kind: "personal" | "broadcast" = mode;
    const audience_scope: "self" | "committee_all" | "all_committees" =
      kind === "personal" ? "self" : canChooseBroadcastScope ? broadcastScope : "committee_all";

    const { error } = await supabase.from("chat_messages").insert({
      conference_id: conferenceId,
      sender_id: myUserId,
      sender_role: myRole,
      kind,
      audience_scope,
      content: newMessage.trim(),
    });

    if (error) return;

    setNewMessage("");
    setSelectedMessage(null);
    setMode("personal");
    setBroadcastScope("committee_all");
    await refreshMessages();
  }

  async function saveEditedMessage() {
    if (!selectedMessage) return;
    if (!newMessage.trim()) return;
    if (!canEditAny) return;

    const { error } = await supabase
      .from("chat_messages")
      .update({ content: newMessage.trim(), updated_at: new Date().toISOString() })
      .eq("id", selectedMessage.id);

    if (error) return;

    setSelectedMessage(null);
    setNewMessage("");
    await refreshMessages();
  }

  async function deleteMessage(messageId: string) {
    if (!canEditAny) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
    if (error) return;
    await refreshMessages();
  }

  function appendEmoji(emoji: string) {
    setNewMessage((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${emoji} `);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Chat</h3>

        {canBroadcast && (
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="chat_mode"
                checked={mode === "personal"}
                onChange={() => setMode("personal")}
              />
              Personal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="chat_mode"
                checked={mode === "broadcast"}
                onChange={() => setMode("broadcast")}
              />
              Broadcast
            </label>
            {mode === "broadcast" && canChooseBroadcastScope ? (
              <label className="flex items-center gap-2 text-sm">
                Scope
                <select
                  value={broadcastScope}
                  onChange={(e) =>
                    setBroadcastScope(e.target.value as "committee_all" | "all_committees")
                  }
                  className="rounded-md border border-white/20 bg-black/30 px-2 py-1"
                >
                  <option value="committee_all">This committee</option>
                  <option value="all_committees">All committees</option>
                </select>
              </label>
            ) : null}
          </div>
        )}
        <div className="flex gap-4">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedMessage ? "Edit your message..." : "Type your message..."}
              className="w-full h-32 px-3 py-2 border rounded-md bg-black/30 border-white/20"
            />
            <div className="mt-2">
              <EmojiQuickInsert onPick={appendEmoji} />
            </div>
            {selectedMessage ? (
              <button
                onClick={saveEditedMessage}
                className="mt-2 px-4 py-2 bg-brand-accent text-white rounded-md hover:opacity-90"
              >
                Save changes
              </button>
            ) : (
              <button
                onClick={submitMessage}
                disabled={!newMessage.trim()}
                className="mt-2 px-4 py-2 bg-brand-accent text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                Send
              </button>
            )}
          </div>
          <div className="w-64 border rounded-md p-2 max-h-64 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMessage(m);
                  setNewMessage(m.content);
                  setMode(canBroadcast ? m.kind : "personal");
                  setBroadcastScope(m.audience_scope === "all_committees" ? "all_committees" : "committee_all");
                }}
                className="p-2 rounded hover:bg-white/10 cursor-pointer text-sm truncate"
              >
                {m.content?.slice(0, 50) || "Empty"}...
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-3">
        <h3 className="font-semibold mb-2">Message list</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-brand-muted">No messages yet.</p>
        ) : (
          <ul className="space-y-2">
            {messages.slice(0, 80).map((m) => (
              <li key={m.id} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-brand-muted">
                      {m.kind === "broadcast"
                        ? `Broadcast (${m.sender_role})${m.audience_scope === "all_committees" ? " · all committees" : ""}`
                        : m.sender_id === myUserId
                          ? "Personal (You)"
                          : "Personal"}
                    </div>
                    <div className="break-words">{m.content}</div>
                  </div>
                  {canEditAny ? (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        className="text-xs text-brand-diplomatic hover:underline"
                        onClick={() => {
                          setSelectedMessage(m);
                          setNewMessage(m.content);
                          setMode(canBroadcast ? m.kind : "personal");
                          setBroadcastScope(
                            m.audience_scope === "all_committees" ? "all_committees" : "committee_all"
                          );
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => void deleteMessage(m.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

