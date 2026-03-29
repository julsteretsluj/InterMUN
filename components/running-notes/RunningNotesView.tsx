"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  user_id: string;
  content: string | null;
  updated_at: string;
}

export function RunningNotesView({
  notes,
  currentUserId,
  myRole,
}: {
  notes: Note[];
  currentUserId: string;
  myRole: string;
}) {
  const [items, setItems] = useState(notes);
  const [activeNote, setActiveNote] = useState<Note | null>(notes[0] || null);
  const [content, setContent] = useState(activeNote?.content || "");
  const supabase = createClient();
  const canViewAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  async function saveNote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !activeNote) return;
    if (activeNote.user_id !== currentUserId) return;
    await supabase
      .from("notes")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeNote.id);
    await refreshNotes();
  }

  async function deleteNote() {
    if (!activeNote) return;
    if (activeNote.user_id !== currentUserId) return;
    const confirmed = confirm("Delete this running note?");
    if (!confirmed) return;
    const { error } = await supabase.from("notes").delete().eq("id", activeNote.id);
    if (error) return;
    await refreshNotes();
  }

  async function refreshNotes() {
    let q = supabase
      .from("notes")
      .select("*")
      .eq("note_type", "running")
      .order("updated_at", { ascending: false });
    if (!canViewAll) q = q.eq("user_id", currentUserId);
    const { data } = await q;
    if (!data) return;
    const typed = data as Note[];
    setItems(typed);
    setActiveNote(typed[0] || null);
    setContent(typed[0]?.content || "");
  }

  async function createNote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        note_type: "running",
        content: "",
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [data, ...prev]);
      setActiveNote(data);
      setContent("");
    }
  }

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0 space-y-2">
        <button
          onClick={createNote}
          className="w-full px-3 py-2 text-left border rounded hover:bg-white/10"
        >
          + New note
        </button>
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              setActiveNote(n);
              setContent(n.content || "");
            }}
            className={`block w-full text-left px-3 py-2 rounded truncate ${
              activeNote?.id === n.id
                ? "bg-blue-600 text-white"
                : "hover:bg-white/10"
            }`}
          >
            {(n.content || "Empty")?.slice(0, 30)}...
          </button>
        ))}
      </div>
      {activeNote && (
        <div className="flex-1">
          {activeNote.user_id !== currentUserId && (
            <p className="text-sm text-brand-muted/70 mb-2">
              View-only (you can only edit your own running notes).
            </p>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border rounded bg-black/30"
            placeholder="Keep notes of everything..."
            disabled={activeNote.user_id !== currentUserId}
          />
          <div className="flex gap-2 items-center mt-2">
            <button
              onClick={saveNote}
              disabled={activeNote.user_id !== currentUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => void deleteNote()}
              disabled={activeNote.user_id !== currentUserId}
              className="px-4 py-2 border rounded hover:bg-white/10 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
