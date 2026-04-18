"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { detectInappropriateTerms } from "@/lib/note-moderation";
import { HelpButton } from "@/components/HelpButton";

interface Note {
  id: string;
  user_id: string;
  content: string | null;
  google_docs_url?: string | null;
  updated_at: string;
}

function syncEditorsFromNote(
  n: Note,
  setContent: (v: string) => void,
  setDocsUrl: (v: string) => void
) {
  setContent(n.content || "");
  setDocsUrl(n.google_docs_url?.trim() || "");
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
  const [content, setContent] = useState(notes[0]?.content || "");
  const [docsUrl, setDocsUrl] = useState(notes[0]?.google_docs_url?.trim() || "");
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
        google_docs_url: docsUrl.trim() || null,
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
    const next = typed.find((n) => n.id === activeNote?.id) || typed[0] || null;
    setActiveNote(next);
    if (next) syncEditorsFromNote(next, setContent, setDocsUrl);
    else {
      setContent("");
      setDocsUrl("");
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
        google_docs_url: null,
      })
      .select()
      .single();
    if (data) {
      const row = data as Note;
      setItems((prev) => [row, ...prev]);
      setActiveNote(row);
      setContent("");
      setDocsUrl("");
    }
  }

  const canEdit = Boolean(activeNote && activeNote.user_id === currentUserId);
  const embedSource = canEdit
    ? docsUrl.trim() || activeNote?.google_docs_url?.trim() || ""
    : activeNote?.google_docs_url?.trim() || "";
  const activeNoteFlaggedTerms = detectInappropriateTerms(activeNote?.content);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full shrink-0 space-y-2 lg:w-56">
        <button
          type="button"
          onClick={createNote}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          + New note
        </button>
        <label className="text-sm font-medium text-brand-navy lg:hidden dark:text-zinc-100">Note</label>
        <select
          className="mun-field lg:hidden"
          value={activeNote?.id ?? ""}
          onChange={(e) => {
            const n = items.find((x) => x.id === e.target.value);
            if (n) {
              setActiveNote(n);
              syncEditorsFromNote(n, setContent, setDocsUrl);
            }
          }}
        >
          {items.map((n) => (
            <option key={n.id} value={n.id}>
              {(n.content || n.google_docs_url || "Empty")?.slice(0, 36)}…
            </option>
          ))}
        </select>
        <div className="hidden max-h-[min(70vh,560px)] flex-col gap-1 overflow-y-auto lg:flex">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setActiveNote(n);
                syncEditorsFromNote(n, setContent, setDocsUrl);
              }}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                activeNote?.id === n.id
                  ? "bg-brand-accent text-white"
                  : "hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {(n.content || n.google_docs_url || "Empty")?.slice(0, 40)}…
            </button>
          ))}
        </div>
      </div>
      {activeNote && (
        <div className="min-w-0 flex-1 space-y-4">
          {activeNote.user_id !== currentUserId && (
            <p className="text-sm text-brand-muted">
              View-only (you can only edit your own running notes).
            </p>
          )}
          {canEdit ? (
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="mun-label normal-case">Google Docs URL (optional)</label>
                  <HelpButton title="Google Docs URL">
                    Paste a shared Google Docs link to show a live preview of your notes. The link is
                    optional; you can keep plain text notes instead.
                  </HelpButton>
                </div>
                <OpenNewGoogleDocButton />
              </div>
              <input
                value={docsUrl}
                onChange={(e) => setDocsUrl(e.target.value)}
                className="mun-field"
                type="url"
                placeholder="https://docs.google.com/document/d/…"
              />
              <p className="mt-1 text-xs text-brand-muted">
                New Google Doc opens in another tab. Save after pasting the link; the preview updates as you
                type.
              </p>
            </div>
          ) : null}
          {embedSource ? (
            <GoogleDocsEmbed googleDocsUrl={embedSource} heading="Running notes document" compact />
          ) : null}
          <div>
            {activeNoteFlaggedTerms.length > 0 ? (
              <p className="mb-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                Reader warning: this note may contain inappropriate language.
              </p>
            ) : null}
            {embedSource ? (
              <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                Plain text (optional)
              </p>
            ) : null}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mun-field h-48 resize-y"
              placeholder="Keep notes of everything…"
              disabled={!canEdit}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveNote()}
              disabled={!canEdit}
              className="mun-btn-primary disabled:opacity-50"
            >
              Save
            </button>
            {canEdit ? (
              <HelpButton title="Save">
                Saves your current running note text (and Google Docs URL, if provided) for your own account.
              </HelpButton>
            ) : null}
            <button
              type="button"
              onClick={() => void deleteNote()}
              disabled={!canEdit}
              className="mun-btn disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
