"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  content: string | null;
  note_type: string;
  updated_at: string;
}

export function ChatsNotesView({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const supabase = createClient();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const ch = supabase
        .channel("notes-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notes" },
          () => {
            supabase
              .from("notes")
              .select("*")
              .eq("note_type", "chat")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .then(({ data }) => data && setNotes(data));
          }
        );
      ch.subscribe();
      channelRef.current = ch;
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [supabase]);

  async function saveNote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !newNote.trim()) return;

    if (selectedNote) {
      await supabase
        .from("notes")
        .update({ content: newNote, updated_at: new Date().toISOString() })
        .eq("id", selectedNote.id);
      setSelectedNote(null);
    } else {
      await supabase.from("notes").insert({
        user_id: user.id,
        note_type: "chat",
        content: newNote,
      });
    }

    setNewNote("");
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("note_type", "chat")
      .order("updated_at", { ascending: false });

    if (data) setNotes(data);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Notes</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type your note..."
              className="w-full h-32 px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
            />
            <button
              onClick={saveNote}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {selectedNote ? "Update" : "Add"} Note
            </button>
          </div>
          <div className="w-64 border rounded-md p-2 max-h-64 overflow-y-auto">
            {notes.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  setSelectedNote(n);
                  setNewNote(n.content || "");
                }}
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm truncate"
              >
                {(n.content || "Empty")?.slice(0, 50)}...
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

