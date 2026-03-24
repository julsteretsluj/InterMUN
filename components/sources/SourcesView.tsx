"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Link2 } from "lucide-react";

interface Source {
  id: string;
  url: string;
  title: string | null;
}

export function SourcesView({ sources }: { sources: Source[] }) {
  const [items, setItems] = useState(sources);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  async function addSource() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !url.trim()) return;
    await supabase.from("sources").insert({
      user_id: user.id,
      url: url.trim(),
      title: title.trim() || null,
    });
    setUrl("");
    setTitle("");
    setShowForm(false);
    const { data } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  }

  async function deleteSource(id: string) {
    await supabase.from("sources").delete().eq("id", id);
    setItems((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Add Source
      </button>
      {showForm && (
        <div className="p-4 border rounded-lg dark:border-slate-700 space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
          />
          <div className="flex gap-2">
            <button
              onClick={addSource}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 p-3 border rounded dark:border-slate-700"
          >
            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-blue-600 hover:underline truncate"
            >
              {s.title || s.url}
            </a>
            <button
              onClick={() => deleteSource(s.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
