"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lightbulb, Plus } from "lucide-react";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";

interface Idea {
  id: string;
  content: string | null;
  google_docs_url?: string | null;
  created_at: string;
}

export function IdeasView({
  ideas,
  conferenceId,
}: {
  ideas: Idea[];
  conferenceId: string;
}) {
  const [items, setItems] = useState(ideas);
  const [selectedId, setSelectedId] = useState<string | null>(() => ideas[0]?.id ?? null);
  const [newContent, setNewContent] = useState("");
  const [newGoogleUrl, setNewGoogleUrl] = useState("");
  const [editing, setEditing] = useState<Idea | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const supabase = createClient();

  const displaySelectedId =
    selectedId != null && items.some((i) => i.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null);
  const selected = items.find((i) => i.id === displaySelectedId) ?? null;

  async function reload() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", user.id)
      .eq("conference_id", conferenceId)
      .order("created_at", { ascending: false });
    if (data) setItems(data as Idea[]);
  }

  async function addIdea() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const gUrl = newGoogleUrl.trim() || null;
    const text = newContent.trim();
    if (!gUrl && !text) return;
    const { data: row } = await supabase
      .from("ideas")
      .insert({
        user_id: user.id,
        conference_id: conferenceId,
        content: text || null,
        google_docs_url: gUrl,
      })
      .select("id")
      .single();
    setNewContent("");
    setNewGoogleUrl("");
    await reload();
    if (row?.id) setSelectedId(row.id as string);
  }

  async function deleteIdea(id: string) {
    await supabase.from("ideas").delete().eq("id", id);
    await reload();
  }

  async function saveEdit() {
    if (!editing) return;
    const gUrl = editGoogleUrl.trim() || null;
    const text = editContent.trim();
    if (!gUrl && !text) return;
    const { error } = await supabase
      .from("ideas")
      .update({ content: text || null, google_docs_url: gUrl })
      .eq("id", editing.id);
    if (error) return;
    await reload();
    setEditing(null);
    setEditContent("");
    setEditGoogleUrl("");
  }

  return (
    <div className="space-y-4">
      {editing && (
        <div className="mun-card space-y-3 border-slate-200 dark:border-white/10">
          <h3 className="font-semibold text-brand-navy dark:text-zinc-100">Edit idea</h3>
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="mun-label normal-case">Google Docs URL</label>
              <OpenNewGoogleDocButton />
            </div>
            <input
              value={editGoogleUrl}
              onChange={(e) => setEditGoogleUrl(e.target.value)}
              className="mun-field"
              type="url"
              placeholder="https://docs.google.com/document/d/…"
            />
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Short idea text (optional)"
            className="mun-field h-32 resize-y"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveEdit()} className="mun-btn-primary">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setEditContent("");
                setEditGoogleUrl("");
              }}
              className="mun-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mun-card space-y-3 border-slate-200 dark:border-white/10">
        <p className="text-sm text-brand-muted">
          Add a Google Doc to draft a resolution idea in place, or type a short note (or both).
        </p>
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <label className="mun-label normal-case">Google Docs URL</label>
            <OpenNewGoogleDocButton />
          </div>
          <input
            value={newGoogleUrl}
            onChange={(e) => setNewGoogleUrl(e.target.value)}
            className="mun-field"
            type="url"
            placeholder="https://docs.google.com/document/d/…"
          />
          <p className="mt-1 text-xs text-brand-muted">
            New Google Doc opens in another tab; paste the link here after it is created.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Resolution idea…"
            className="mun-field min-h-[80px] flex-1 resize-y"
          />
          <button
            type="button"
            onClick={() => void addIdea()}
            className="inline-flex h-fit shrink-0 items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">No ideas yet.</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 space-y-2 lg:w-52">
            <label className="text-sm font-medium text-brand-navy lg:hidden dark:text-zinc-100">
              Idea
            </label>
            <select
              className="mun-field lg:hidden"
              value={displaySelectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {items.map((idea, idx) => (
                <option key={idea.id} value={idea.id}>
                  {idea.content?.slice(0, 40) || `Idea ${items.length - idx}`}
                </option>
              ))}
            </select>
            <div className="hidden max-h-[min(70vh,640px)] flex-col gap-1 overflow-y-auto lg:flex">
              {items.map((idea, idx) => (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => setSelectedId(idea.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    displaySelectedId === idea.id
                      ? "border-brand-accent/45 bg-brand-accent/10 font-medium text-brand-navy dark:border-brand-accent/40 dark:bg-brand-accent/15 dark:text-brand-navy"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="line-clamp-2">
                    {idea.content?.trim() || (idea.google_docs_url ? "Linked doc" : `Idea ${items.length - idx}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="min-w-0 flex-1 space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black/25 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-xs text-brand-muted">
                  Added {new Date(selected.created_at).toLocaleString()}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(selected);
                      setEditContent(selected.content || "");
                      setEditGoogleUrl(selected.google_docs_url?.trim() || "");
                    }}
                    className="text-sm text-brand-accent hover:underline dark:text-brand-accent-bright"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteIdea(selected.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {selected.google_docs_url?.trim() ? (
                <GoogleDocsEmbed
                  googleDocsUrl={selected.google_docs_url.trim()}
                  heading="Idea document"
                  compact
                />
              ) : null}
              {selected.content?.trim() ? (
                <div>
                  {selected.google_docs_url?.trim() ? (
                    <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">Summary</p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-brand-navy dark:text-zinc-200">
                    {selected.content}
                  </p>
                </div>
              ) : !selected.google_docs_url?.trim() ? (
                <p className="text-sm text-brand-muted">Empty idea.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
