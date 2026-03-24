"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  content: string | null;
  updated_at: string;
}

export function RunningNotesView({ notes }: { notes: Note[] }) {
  const [items, setItems] = useState(notes);
  const [activeNote, setActiveNote] = useState<Note | null>(notes[0] || null);
  const [content, setContent] = useState(activeNote?.content || "");
  const supabase = createClient();

  async function saveNote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !activeNote) return;
    await supabase
      .from("notes")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeNote.id);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("note_type", "running")
      .order("updated_at", { ascending: false });
    if (data) {
      setItems(data);
      const updated = data.find((n) => n.id === activeNote.id);
      if (updated) setActiveNote(updated);
    }
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
          className="w-full px-3 py-2 text-left border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
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
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {(n.content || "Empty")?.slice(0, 30)}...
          </button>
        ))}
      </div>
      {activeNote && (
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border rounded dark:bg-slate-700"
            placeholder="Keep notes of everything..."
          />
          <button
            onClick={saveNote}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
