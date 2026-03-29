"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Link2 } from "lucide-react";

interface Source {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
}

export function SourcesView({
  sources,
  currentUserId,
  myRole,
  canEditAll,
}: {
  sources: Source[];
  currentUserId: string;
  myRole: string;
  canEditAll: boolean;
}) {
  const [items, setItems] = useState(sources);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const supabase = createClient();

  async function refreshSources() {
    if (canEditAll) {
      const { data } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setItems(data as Source[]);
      return;
    }

    const { data: follows } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", currentUserId);

    const followedIds = (follows ?? []).map((f) => f.followed_id as string);
    const ids = [currentUserId, ...followedIds];

    const { data } = await supabase
      .from("sources")
      .select("*")
      .in("user_id", ids.length > 0 ? ids : [currentUserId])
      .order("created_at", { ascending: false });

    if (data) setItems(data as Source[]);
  }

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
    await refreshSources();
  }

  async function saveEdit() {
    if (!editing) return;
    if (!canEditAll && editing.user_id !== currentUserId) return;
    if (!editUrl.trim()) return;

    const { error } = await supabase
      .from("sources")
      .update({
        url: editUrl.trim(),
        title: editTitle.trim() || null,
      })
      .eq("id", editing.id);

    if (error) return;

    setEditing(null);
    setEditUrl("");
    setEditTitle("");
    await refreshSources();
  }

  async function deleteSource(id: string) {
    if (!canEditAll) {
      const src = items.find((s) => s.id === id);
      if (!src || src.user_id !== currentUserId) return;
    }
    const { error } = await supabase.from("sources").delete().eq("id", id);
    if (error) return;
    await refreshSources();
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
        <div className="p-4 border rounded-lg border-white/15 space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border rounded bg-black/30"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 border rounded bg-black/30"
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
              className="px-4 py-2 border rounded hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="p-4 border rounded-lg border-white/15 space-y-3">
          <h3 className="font-semibold">Edit source</h3>
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-black/30"
          />
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-black/30"
            placeholder="Title (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void saveEdit()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save changes
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setEditUrl("");
                setEditTitle("");
              }}
              className="px-4 py-2 border rounded hover:bg-white/10"
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
            className="flex items-center gap-3 p-3 border rounded border-white/15"
          >
            <Link2 className="w-4 h-4 text-brand-muted shrink-0" />
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-blue-600 hover:underline truncate"
            >
              {s.title || s.url}
            </a>
            {(canEditAll || s.user_id === currentUserId) && (
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(s);
                    setEditUrl(s.url);
                    setEditTitle(s.title || "");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSource(s.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
