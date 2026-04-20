"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";
import { detectInappropriateTerms } from "@/lib/note-moderation";
import { HelpButton } from "@/components/HelpButton";
import { EmojiQuickInsert } from "@/components/EmojiQuickInsert";
import {
  RUNNING_NOTE_TAG_PRESETS,
  normalizeRunningNoteTags,
  runningNoteSidebarLabel,
} from "@/lib/running-notes-tags";

interface Note {
  id: string;
  user_id: string;
  content: string | null;
  google_docs_url?: string | null;
  title?: string | null;
  tags?: string[] | null;
  updated_at: string;
}

function syncFromNote(
  n: Note,
  setContent: (v: string) => void,
  setDocsUrl: (v: string) => void,
  setTitle: (v: string) => void,
  setTags: (v: string[]) => void
) {
  setContent(n.content || "");
  setDocsUrl(n.google_docs_url?.trim() || "");
  setTitle(n.title?.trim() ?? "");
  setTags(normalizeRunningNoteTags(n.tags ?? []));
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
  const router = useRouter();
  const [items, setItems] = useState(notes);
  const [activeNote, setActiveNote] = useState<Note | null>(notes[0] || null);
  const [content, setContent] = useState(notes[0]?.content || "");
  const [docsUrl, setDocsUrl] = useState(notes[0]?.google_docs_url?.trim() || "");
  const [title, setTitle] = useState(notes[0]?.title?.trim() ?? "");
  const [tags, setTags] = useState<string[]>(() =>
    normalizeRunningNoteTags(notes[0]?.tags ?? [])
  );
  const [customTagDraft, setCustomTagDraft] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const supabase = createClient();
  const canViewAll = myRole === "chair" || myRole === "smt" || myRole === "admin";

  const activeNoteIdRef = useRef<string | null>(activeNote?.id ?? null);
  activeNoteIdRef.current = activeNote?.id ?? null;

  useEffect(() => {
    setItems(notes);
    const id = activeNoteIdRef.current;
    const keep = id ? notes.find((n) => n.id === id) : null;
    const next = keep ?? notes[0] ?? null;
    setActiveNote(next);
    if (next) syncFromNote(next, setContent, setDocsUrl, setTitle, setTags);
    else {
      setContent("");
      setDocsUrl("");
      setTitle("");
      setTags([]);
    }
    setCustomTagDraft("");
  }, [notes]);

  function togglePresetTag(label: string) {
    setTags((prev) => {
      const lower = label.toLowerCase();
      const has = prev.some((t) => t.toLowerCase() === lower);
      if (has) return normalizeRunningNoteTags(prev.filter((t) => t.toLowerCase() !== lower));
      return normalizeRunningNoteTags([...prev, label]);
    });
  }

  function addCustomTag() {
    const t = customTagDraft.trim();
    if (!t) return;
    setTags((prev) => normalizeRunningNoteTags([...prev, t]));
    setCustomTagDraft("");
  }

  function appendEmoji(emoji: string) {
    setContent((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${emoji} `);
  }

  async function saveNote() {
    setMutationError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !activeNote) return;
    if (activeNote.user_id !== currentUserId) return;
    const titleTrim = title.trim();
    const tagsStored = normalizeRunningNoteTags(tags);
    const { error } = await supabase
      .from("notes")
      .update({
        title: titleTrim || null,
        tags: tagsStored,
        content,
        google_docs_url: docsUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeNote.id);
    if (error) {
      setMutationError(error.message);
      return;
    }
    await refreshNotes();
    router.refresh();
  }

  async function deleteNote() {
    setMutationError(null);
    if (!activeNote) return;
    if (activeNote.user_id !== currentUserId) return;
    const confirmed = confirm("Delete this running note?");
    if (!confirmed) return;
    const { error } = await supabase.from("notes").delete().eq("id", activeNote.id);
    if (error) {
      setMutationError(error.message);
      return;
    }
    await refreshNotes();
    router.refresh();
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
    if (next) syncFromNote(next, setContent, setDocsUrl, setTitle, setTags);
    else {
      setContent("");
      setDocsUrl("");
      setTitle("");
      setTags([]);
    }
    setCustomTagDraft("");
  }

  async function createNote() {
    setMutationError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        note_type: "running",
        title: null,
        tags: [],
        content: "",
        google_docs_url: null,
      })
      .select()
      .single();
    if (error) {
      setMutationError(error.message);
      return;
    }
    if (data) {
      const row = data as Note;
      setItems((prev) => [row, ...prev]);
      setActiveNote(row);
      syncFromNote(row, setContent, setDocsUrl, setTitle, setTags);
      setCustomTagDraft("");
      router.refresh();
    }
  }

  const canEdit = Boolean(activeNote && activeNote.user_id === currentUserId);
  const embedSource = canEdit
    ? docsUrl.trim() || activeNote?.google_docs_url?.trim() || ""
    : activeNote?.google_docs_url?.trim() || "";
  const activeNoteFlaggedTerms = detectInappropriateTerms(activeNote?.content);

  return (
    <div className="space-y-4">
      {mutationError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {mutationError}
        </p>
      ) : null}
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
              syncFromNote(n, setContent, setDocsUrl, setTitle, setTags);
              setCustomTagDraft("");
            }
          }}
        >
          {items.map((n) => (
            <option key={n.id} value={n.id}>
              {runningNoteSidebarLabel(n)}
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
                syncFromNote(n, setContent, setDocsUrl, setTitle, setTags);
                setCustomTagDraft("");
              }}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                activeNote?.id === n.id
                  ? "bg-brand-accent text-white"
                  : "hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
              title={runningNoteSidebarLabel(n)}
            >
              {runningNoteSidebarLabel(n)}
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
            <div className="space-y-2">
              <label className="mun-label normal-case block">Note name</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mun-field"
                type="text"
                placeholder="e.g. Sunday bloc prep"
                maxLength={120}
              />
              <p className="text-xs text-brand-muted">
                Shown in the note list. If empty, tags or note text is used instead.
              </p>
            </div>
          ) : activeNote.title?.trim() ? (
            <p className="text-sm text-brand-muted">
              <span className="font-medium text-brand-navy dark:text-zinc-200">Note name: </span>
              {activeNote.title.trim()}
            </p>
          ) : null}
          {canEdit ? (
            <div className="space-y-2">
              <label className="mun-label normal-case block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {RUNNING_NOTE_TAG_PRESETS.map((preset) => {
                  const on = tags.some((t) => t.toLowerCase() === preset.toLowerCase());
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => togglePresetTag(preset)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        on
                          ? "border-brand-accent bg-brand-accent/15 text-brand-navy dark:bg-brand-accent/25 dark:text-zinc-100"
                          : "border-slate-200 text-brand-muted hover:border-brand-accent/40 dark:border-white/15 dark:hover:border-brand-accent/40"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <input
                  value={customTagDraft}
                  onChange={(e) => setCustomTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  className="mun-field min-w-[12rem] flex-1"
                  type="text"
                  placeholder="Add another tag…"
                  maxLength={48}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="mun-btn shrink-0 px-3 py-2 text-sm"
                >
                  Add tag
                </button>
              </div>
              {tags.length > 0 ? (
                <p className="text-xs text-brand-muted">
                  Selected: {normalizeRunningNoteTags(tags).join(", ")}
                </p>
              ) : null}
            </div>
          ) : activeNote.tags && activeNote.tags.length > 0 ? (
            <p className="text-sm text-brand-muted">
              <span className="font-medium text-brand-navy dark:text-zinc-200">Tags: </span>
              {normalizeRunningNoteTags(activeNote.tags).join(", ")}
            </p>
          ) : null}
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
            {canEdit ? <EmojiQuickInsert onPick={appendEmoji} /> : null}
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
                Saves your note name, tags, running note text, and Google Docs URL (if provided) for your own
                account.
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
    </div>
  );
}
