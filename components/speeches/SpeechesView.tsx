"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mic, Plus } from "lucide-react";

interface Speech {
  id: string;
  title: string | null;
  content: string | null;
}

export function SpeechesView({ speeches }: { speeches: Speech[] }) {
  const [items, setItems] = useState(speeches);
  const [editing, setEditing] = useState<Speech | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const supabase = createClient();

  async function saveSpeech() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (editing) {
      await supabase
        .from("speeches")
        .update({
          title: form.title || null,
          content: form.content || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
    } else {
      await supabase.from("speeches").insert({
        user_id: user.id,
        title: form.title || null,
        content: form.content || null,
      });
    }
    setEditing(null);
    setShowForm(false);
    setForm({ title: "", content: "" });
    const { data } = await supabase
      .from("speeches")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setItems(data);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setShowForm(true);
          setEditing(null);
          setForm({ title: "", content: "" });
        }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        New Speech
      </button>
      {(showForm || editing) && (
        <div className="p-4 border rounded-lg dark:border-slate-700 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Speech title"
            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Write your speech..."
            className="w-full h-48 px-3 py-2 border rounded dark:bg-slate-700"
          />
          <div className="flex gap-2">
            <button
              onClick={saveSpeech}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {items.map((s) => (
          <div
            key={s.id}
            className="p-4 border rounded-lg dark:border-slate-700 flex justify-between items-start"
          >
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <h4 className="font-medium">{s.title || "Untitled"}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {s.content || "No content"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditing(s);
                setForm({
                  title: s.title || "",
                  content: s.content || "",
                });
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
