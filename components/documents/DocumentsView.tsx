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
  chair_feedback?: string | null;
}

export function DocumentsView({
  documents,
  currentUserId,
  canViewAll,
  canEditAll,
  myRole,
  delegateOptions,
  chairOptions,
}: {
  documents: Document[];
  currentUserId: string;
  canViewAll: boolean;
  canEditAll: boolean;
  myRole: string;
  delegateOptions: { id: string; label: string }[];
  chairOptions: { id: string; label: string }[];
}) {
  const role = myRole.toLowerCase();
  const canManagePositionPapers = role === "chair" || role === "smt" || role === "admin";
  const canManageChairReports = role === "smt" || role === "admin";
  const canManageRop = role === "smt" || role === "admin";
  const canManageAwardCriteria = role === "smt" || role === "admin";
  const isDelegate = role === "delegate";
  const [docs, setDocs] = useState(documents);
  const [selectedId, setSelectedId] = useState<string | null>(() => documents[0]?.id ?? null);
  const [editing, setEditing] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    user_id: currentUserId,
    doc_type:
      "prep_doc" as
        | "position_paper"
        | "prep_doc"
        | "chair_report"
        | "rop"
        | "chair_notes"
        | "award_criteria",
    title: "",
    content: "",
    google_docs_url: "",
    chair_feedback: "",
  });
  const supabase = createClient();

  const displaySelectedId =
    selectedId != null && docs.some((d) => d.id === selectedId)
      ? selectedId
      : (docs[0]?.id ?? null);
  const selected = docs.find((d) => d.id === displaySelectedId) ?? null;
  const chairReportDocs = docs.filter((d) => d.doc_type === "chair_report");
  const ropDocs = docs.filter((d) => d.doc_type === "rop");
  const awardCriteriaDocs = docs.filter((d) => d.doc_type === "award_criteria");
  const chairNotesDocs = docs.filter((d) => d.doc_type === "chair_notes");
  const prepDocs = docs.filter((d) => d.doc_type === "prep_doc");
  const otherDocs = docs.filter(
    (d) =>
      d.doc_type !== "chair_report" &&
      d.doc_type !== "rop" &&
      d.doc_type !== "award_criteria" &&
      d.doc_type !== "prep_doc" &&
      d.doc_type !== "chair_notes"
  );

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

    if (isDelegate && form.doc_type === "position_paper") {
      alert("Delegates cannot upload Position Papers directly. Use another document type.");
      return;
    }

    if (form.doc_type === "position_paper" && !canManagePositionPapers) {
      alert("Only chairs/SMT/admin can upload Position Papers.");
      return;
    }
    if (form.doc_type === "chair_report" && !canManageChairReports) {
      alert("Only SMT/admin can upload Chair Reports.");
      return;
    }
    if (form.doc_type === "rop" && !canManageRop) {
      alert("Only SMT/admin can upload RoP documents.");
      return;
    }
    if (form.doc_type === "award_criteria" && !canManageAwardCriteria) {
      alert("Only SMT/admin can upload Award Criteria documents.");
      return;
    }

    const targetUserId =
      (form.doc_type === "position_paper" && canManagePositionPapers) ||
      (form.doc_type === "chair_report" && canManageChairReports) ||
      (form.doc_type === "rop" && canManageRop)
        ? form.user_id
        : currentUserId;

    const localText = form.content.trim();
    const gUrl = form.google_docs_url.trim() || null;
    if (!localText && !gUrl) {
      alert("Add either local text content or a Google Docs URL.");
      return;
    }
    if (editing) {
      const canEditThis =
        canEditAll ||
        editing.user_id === currentUserId ||
        (canManagePositionPapers && editing.doc_type === "position_paper") ||
        (canManageChairReports && editing.doc_type === "chair_report") ||
        (canManageRop && editing.doc_type === "rop") ||
        (canManageAwardCriteria && editing.doc_type === "award_criteria");
      if (!canEditThis) return;
      await supabase
        .from("documents")
        .update({
          user_id: targetUserId,
          doc_type: form.doc_type,
          title: form.title || null,
          content: localText || null,
          google_docs_url: gUrl,
          chair_feedback:
            form.doc_type === "position_paper" && canManagePositionPapers
              ? form.chair_feedback.trim() || null
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      setSelectedId(editing.id);
    } else {
      const { data: row } = await supabase
        .from("documents")
        .insert({
          user_id: targetUserId,
          doc_type: form.doc_type,
          title: form.title || null,
          content: localText || null,
          google_docs_url: gUrl,
          chair_feedback:
            form.doc_type === "position_paper" && canManagePositionPapers
              ? form.chair_feedback.trim() || null
              : null,
        })
        .select("id")
        .single();
      if (row?.id) setSelectedId(row.id as string);
    }
    await refreshDocs();
    setEditing(null);
    setShowForm(false);
    setForm({
      user_id: currentUserId,
      doc_type: "prep_doc",
      title: "",
      content: "",
      google_docs_url: "",
      chair_feedback: "",
    });
  }

  async function deleteDocument(docId: string) {
    const src = docs.find((d) => d.id === docId);
    if (!src) return;
    const canDeleteThis =
      canEditAll ||
      src.user_id === currentUserId ||
      (canManagePositionPapers && src.doc_type === "position_paper") ||
      (canManageChairReports && src.doc_type === "chair_report") ||
      (canManageRop && src.doc_type === "rop") ||
      (canManageAwardCriteria && src.doc_type === "award_criteria");
    if (!canDeleteThis) return;
    const ok = confirm("Delete this document?");
    if (!ok) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) return;
    setDeleteId(null);
    await refreshDocs();
  }

  return (
    <div className="space-y-4 font-serif">
      {isDelegate ? (
        <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 px-4 py-3 text-sm text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-100">
          <p className="font-medium">Prep document section</p>
          <p className="mt-1">
            You can upload, view, and edit your own <strong>Prep documents</strong> directly from this page.
          </p>
        </div>
      ) : null}
      <div className="rounded-lg border border-brand-navy/10 bg-brand-paper px-4 py-3 text-sm text-brand-navy">
        <p className="font-medium">Position paper guide</p>
        <p className="mt-1 text-brand-muted">
          Download the placeholder guide while the final PDF is being prepared.
        </p>
        <a
          href="/downloads/position-paper-guide-placeholder.txt"
          download
          className="mt-2 inline-block text-sm font-medium text-brand-gold hover:underline"
        >
          Download placeholder guide
        </a>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowForm(true);
          setEditing(null);
          setForm({
            user_id: currentUserId,
            doc_type: "prep_doc",
            title: "",
            content: "",
            google_docs_url: "",
            chair_feedback: "",
          });
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-95"
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
                {!isDelegate ? <option value="position_paper">Position paper</option> : null}
                {canManageChairReports ? <option value="chair_report">Chair report</option> : null}
                {canManageRop ? <option value="rop">RoP</option> : null}
                {canManageAwardCriteria ? <option value="award_criteria">Award criteria</option> : null}
                {!isDelegate ? <option value="chair_notes">Chair notes</option> : null}
                <option value="prep_doc">Prep document</option>
              </select>
              {isDelegate ? (
                <p className="mt-1 text-xs text-brand-muted">
                  Position papers are uploaded by chairs with feedback.
                </p>
              ) : null}
            </div>
            {form.doc_type === "position_paper" && canManagePositionPapers ? (
              <div>
                <label className="mun-label mb-1 block normal-case">Delegate owner</label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  className="mun-field"
                >
                  {delegateOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {form.doc_type === "chair_report" && canManageChairReports ? (
              <div>
                <label className="mun-label mb-1 block normal-case">Chair recipient</label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  className="mun-field"
                >
                  {chairOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
                below is optional. Every document needs either local text, a Google Doc link, or both.
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
            {form.doc_type === "position_paper" && canManagePositionPapers ? (
              <div>
                <label className="mun-label mb-1 block normal-case">Chair feedback</label>
                <textarea
                  value={form.chair_feedback}
                  onChange={(e) => setForm({ ...form, chair_feedback: e.target.value })}
                  className="mun-field h-32 resize-y"
                  placeholder="Feedback for the delegate position paper..."
                />
              </div>
            ) : null}
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
              {chairReportDocs.length > 0 ? (
                <p className="px-1 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Chair reports
                </p>
              ) : null}
              {chairReportDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-brand-diplomatic/50 bg-brand-diplomatic/12 font-medium text-brand-navy dark:border-brand-diplomatic/45 dark:bg-brand-diplomatic/10 dark:text-brand-navy"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs capitalize text-brand-muted">Chair report</span>
                  </span>
                </button>
              ))}
              {ropDocs.length > 0 ? (
                <p className="px-1 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  RoP
                </p>
              ) : null}
              {ropDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-cyan-300 bg-cyan-50 font-medium text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-950/30 dark:text-cyan-100"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs capitalize text-brand-muted">RoP</span>
                  </span>
                </button>
              ))}
              {awardCriteriaDocs.length > 0 ? (
                <p className="px-1 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Award criteria
                </p>
              ) : null}
              {awardCriteriaDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-pink-300 bg-pink-50 font-medium text-pink-900 dark:border-pink-500/40 dark:bg-pink-950/30 dark:text-pink-100"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs capitalize text-brand-muted">Award criteria</span>
                  </span>
                </button>
              ))}
              {prepDocs.length > 0 ? (
                <p className="px-1 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Prep documents
                </p>
              ) : null}
              {prepDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-blue-300 bg-blue-50 font-medium text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-100"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs capitalize text-brand-muted">Prep document</span>
                  </span>
                </button>
              ))}
              {chairNotesDocs.length > 0 ? (
                <p className="px-1 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Chair notes
                </p>
              ) : null}
              {chairNotesDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-amber-300 bg-amber-50 font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-black/20"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <span className="min-w-0">
                    <span className="block truncate">{d.title || "Untitled"}</span>
                    <span className="text-xs capitalize text-brand-muted">Chair notes</span>
                  </span>
                </button>
              ))}
              {otherDocs.length > 0 ? (
                <p className="px-1 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Other documents
                </p>
              ) : null}
              {otherDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    displaySelectedId === d.id
                      ? "border-brand-gold/45 bg-brand-gold/10 font-medium text-brand-navy dark:border-brand-gold/40 dark:bg-brand-gold/15 dark:text-brand-navy"
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
                {(canEditAll ||
                  selected.user_id === currentUserId ||
                  (canManagePositionPapers && selected.doc_type === "position_paper") ||
                  (canManageChairReports && selected.doc_type === "chair_report") ||
                  (canManageRop && selected.doc_type === "rop") ||
                  (canManageAwardCriteria && selected.doc_type === "award_criteria")) && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(selected);
                        setForm({
                          user_id: selected.user_id,
                          doc_type: selected.doc_type as "position_paper" | "prep_doc",
                          title: selected.title || "",
                          content: selected.content || "",
                          google_docs_url: selected.google_docs_url?.trim() || "",
                          chair_feedback: selected.chair_feedback?.trim() || "",
                        });
                        setShowForm(false);
                      }}
                      className="text-sm font-medium text-brand-gold hover:underline dark:text-brand-gold-bright"
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
              {selected.doc_type === "position_paper" ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Chair feedback</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900/90 dark:text-amber-100/90">
                    {selected.chair_feedback?.trim() || "No feedback added yet."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
