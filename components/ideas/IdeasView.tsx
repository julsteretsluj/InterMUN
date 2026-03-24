"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Lightbulb } from "lucide-react";

interface Idea {
  id: string;
  content: string | null;
  created_at: string;
}

export function IdeasView({ ideas }: { ideas: Idea[] }) {
  const [items, setItems] = useState(ideas);
  const [newContent, setNewContent] = useState("");
  const supabase = createClient();

  async function addIdea() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !newContent.trim()) return;
    await supabase.from("ideas").insert({
      user_id: user.id,
      content: newContent,
    });
    setNewContent("");
    const { data } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
  }

  async function deleteIdea(id: string) {
    await supabase.from("ideas").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Resolution idea..."
          className="flex-1 px-3 py-2 border rounded dark:bg-slate-700 min-h-[80px]"
        />
        <button
          onClick={addIdea}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 h-fit"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((idea) => (
          <div
            key={idea.id}
            className="flex items-start gap-3 p-4 border rounded-lg dark:border-slate-700"
          >
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{idea.content || "Empty idea"}</p>
            </div>
            <button
              onClick={() => deleteIdea(idea.id)}
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
