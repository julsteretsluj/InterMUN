"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Plus } from "lucide-react";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";

interface Document {
  id: string;
  user_id: string;
  doc_type: string;
  title: string | null;
  content: string | null;
  file_url: string | null;
  google_docs_url?: string | null;
}

export function DocumentsView({
  documents,
  currentUserId,
  canViewAll,
  canEditAll,
}: {
  documents: Document[];
  currentUserId: string;
  canViewAll: boolean;
  canEditAll: boolean;
}) {
  const [docs, setDocs] = useState(documents);
  const [selectedId, setSelectedId] = useState<string | null>(() => documents[0]?.id ?? null);
  const [editing, setEditing] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doc_type: "position_paper" as "position_paper" | "prep_doc",
    title: "",
    content: "",
    google_docs_url: "",
  });
  const supabase = createClient();

  const displaySelectedId =
    selectedId != null && docs.some((d) => d.id === selectedId)
      ? selectedId
      : (docs[0]?.id ?? null);
  const selected = docs.find((d) => d.id === displaySelectedId) ?? null;

  async function refreshDocs() {
    let q = supabase.from("documents").select("*").order("updated_at", { ascending: false });
    if (!canViewAll) q = q.eq("user_id", currentUserId);
    const { data } = await q;
    if (data) setDocs(data as Document[]);
  }

  async function saveDocument() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const gUrl = form.google_docs_url.trim() || null;
    if (editing) {
      if (!canEditAll && editing.user_id !== currentUserId) return;
      await supabase
        .from("documents")
        .update({
          doc_type: form.doc_type,
          title: form.title || null,
          content: form.content || null,
          google_docs_url: gUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      setSelectedId(editing.id);
    } else {
      const { data: row } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          doc_type: form.doc_type,
          title: form.title || null,
          content: form.content || null,
          google_docs_url: gUrl,
        })
        .select("id")
        .single();
      if (row?.id) setSelectedId(row.id as string);
    }
    await refreshDocs();
    setEditing(null);
    setShowForm(false);
    setForm({ doc_type: "position_paper", title: "", content: "", google_docs_url: "" });
  }

  async function deleteDocument(docId: string) {
    const src = docs.find((d) => d.id === docId);
    if (!src) return;
    if (!canEditAll && src.user_id !== currentUserId) return;
    const ok = confirm("Delete this document?");
    if (!ok) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) return;
    setDeleteId(null);
    await refreshDocs();
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setShowForm(true);
          setEditing(null);
          setForm({ doc_type: "position_paper", title: "", content: "", google_docs_url: "" });
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        <Plus className="h-4 w-4" />
        Add document
      </button>
      {(showForm || editing) && (
        <div className="mun-card space-y-3 border-slate-200 dark:border-white/10">
          <h3 className="font-semibold text-brand-navy dark:text-zinc-100">
            {editing ? "Edit" : "New"} document
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mun-label mb-1 block normal-case">Type</label>
              <select
                value={form.doc_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    doc_type: e.target.value as "position_paper" | "prep_doc",
                  })
                }
                className="mun-field"
              >
                <option value="position_paper">Position paper</option>
                <option value="prep_doc">Prep document</option>
              </select>
            </div>
            <div>
              <label className="mun-label mb-1 block normal-case">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mun-field"
                placeholder="Document title"
              />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="mun-label normal-case">Google Docs URL</label>
                <OpenNewGoogleDocButton />
              </div>
              <input
                value={form.google_docs_url}
                onChange={(e) => setForm({ ...form, google_docs_url: e.target.value })}
                className="mun-field"
                type="url"
                placeholder="https://docs.google.com/document/d/… (embed view/edit in app)"
              />
              <p className="mt-1 text-xs text-brand-muted">
                Use New Google Doc to open Google in a new tab, then paste the doc link here. Plain text
                below is optional.
              </p>
            </div>
            <div>
              <label className="mun-label mb-1 block normal-case">Plain text (optional)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mun-field h-40 resize-y"
                placeholder="Notes or draft text…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveDocument()} className="mun-btn-primary">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="mun-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-brand-muted">No documents yet. Add one or link a Google Doc.</p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 space-y-2 lg:w-64">
            <label className="text-sm font-medium text-brand-navy lg:hidden dark:text-zinc-100">
              Document
            </label>
            <select
              className="mun-field lg:hidden"
              value={displaySelectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || "Untitled"} ({d.doc_type.replace("_", " ")})
                </option>
              ))}
            </select>
            <div className="hidden max-h-[min(70vh,640px)] flex-col gap-1 overflow-y-auto pr-1 lg:flex">
              {docs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-violet-300 bg-violet-50 font-medium text-violet-900 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-100"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs capitalize text-brand-muted">
                      {d.doc_type.replace("_", " ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="min-w-0 flex-1 space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black/25 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-brand-navy dark:text-zinc-100">
                    {selected.title || "Untitled"}
                  </h3>
                  <p className="text-sm capitalize text-brand-muted">
                    {selected.doc_type.replace("_", " ")}
                  </p>
                </div>
                {(canEditAll || selected.user_id === currentUserId) && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(selected);
                        setForm({
                          doc_type: selected.doc_type as "position_paper" | "prep_doc",
                          title: selected.title || "",
                          content: selected.content || "",
                          google_docs_url: selected.google_docs_url?.trim() || "",
                        });
                        setShowForm(false);
                      }}
                      className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteDocument(selected.id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                      disabled={deleteId === selected.id}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {selected.google_docs_url?.trim() ? (
                <GoogleDocsEmbed
                  googleDocsUrl={selected.google_docs_url.trim()}
                  heading="Linked document"
                  compact
                />
              ) : null}
              {selected.content?.trim() ? (
                <div>
                  {selected.google_docs_url?.trim() ? (
                    <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                      Notes
                    </p>
                  ) : null}
                  <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-4 font-sans text-sm text-slate-800 dark:border-white/10 dark:bg-black/30 dark:text-zinc-200">
                    {selected.content}
                  </pre>
                </div>
              ) : !selected.google_docs_url?.trim() ? (
                <p className="text-sm text-brand-muted">
                  No Google Doc linked yet. Use Edit to add a{" "}
                  <code className="text-xs">docs.google.com/document/d/…</code> URL.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
