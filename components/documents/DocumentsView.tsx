"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Plus } from "lucide-react";

interface Document {
  id: string;
  user_id: string;
  doc_type: string;
  title: string | null;
  content: string | null;
  file_url: string | null;
}

export function DocumentsView({
  documents,
  currentUserId,
  myRole,
  canViewAll,
  canEditAll,
}: {
  documents: Document[];
  currentUserId: string;
  myRole: string;
  canViewAll: boolean;
  canEditAll: boolean;
}) {
  const [docs, setDocs] = useState(documents);
  const [editing, setEditing] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doc_type: "position_paper" as "position_paper" | "prep_doc",
    title: "",
    content: "",
  });
  const supabase = createClient();

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
    if (editing) {
      if (!canEditAll && editing.user_id !== currentUserId) return;
      await supabase
        .from("documents")
        .update({
          doc_type: form.doc_type,
          title: form.title || null,
          content: form.content || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
    } else {
      await supabase.from("documents").insert({
        user_id: user.id,
        doc_type: form.doc_type,
        title: form.title || null,
        content: form.content || null,
      });
    }
    await refreshDocs();
    setEditing(null);
    setShowForm(false);
    setForm({ doc_type: "position_paper", title: "", content: "" });
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
        onClick={() => {
          setShowForm(true);
          setEditing(null);
          setForm({ doc_type: "position_paper", title: "", content: "" });
        }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        Add Document
      </button>
      {(showForm || editing) && (
        <div className="border rounded-lg p-4 border-white/15">
          <h3 className="font-semibold mb-3">
            {editing ? "Edit" : "New"} Document
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select
                value={form.doc_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    doc_type: e.target.value as "position_paper" | "prep_doc",
                  })
                }
                className="w-full px-3 py-2 border rounded bg-black/30"
              >
                <option value="position_paper">Position Paper</option>
                <option value="prep_doc">Prep Document</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-black/30"
                placeholder="Document title"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full h-40 px-3 py-2 border rounded bg-black/30"
                placeholder="Paste or type content..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="px-4 py-2 border rounded hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className="border rounded-lg p-4 flex justify-between items-start border-white/15"
          >
            <div className="flex items-start gap-3">
              <FileText className="w-8 h-8 text-brand-muted shrink-0" />
              <div>
                <h4 className="font-medium">
                  {d.title || "Untitled"}
                </h4>
                <p className="text-sm text-brand-muted/70 capitalize">
                  {d.doc_type.replace("_", " ")}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {(canEditAll || d.user_id === currentUserId) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(d);
                    setForm({
                      doc_type: d.doc_type as "position_paper" | "prep_doc",
                      title: d.title || "",
                      content: d.content || "",
                    });
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
              {(canEditAll || d.user_id === currentUserId) && (
                <button
                  type="button"
                  onClick={() => void deleteDocument(d.id)}
                  className="text-sm text-red-600 hover:underline"
                  disabled={deleteId === d.id}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
