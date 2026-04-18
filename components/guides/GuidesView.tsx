"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OpenNewGoogleDocButton } from "@/components/google-docs/OpenNewGoogleDocButton";
import { GoogleDocsEmbed } from "@/components/resolutions/GoogleDocsEmbed";

interface Guide {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  google_docs_url?: string | null;
}

const DEFAULT_GUIDES: Guide[] = [
  {
    id: "rop",
    slug: "rop",
    title: "Rules of Procedure (RoP)",
    content: `# Rules of Procedure

## Points and Motions
- **Point of Order**: Correct procedure
- **Point of Information**: Question to speaker
- **Point of Personal Privilege**: Personal comfort
- **Motion to Table**: Postpone debate
- **Motion to Adjourn**: End session

## Voting
- Simple majority for procedural matters
- 2/3 majority for substantive matters
- Roll-call vote if requested`,
    google_docs_url: null,
  },
  {
    id: "examples",
    slug: "examples",
    title: "Examples",
    content: `# Examples

## Resolution Format
\`\`\`
The General Assembly,
...
1. Calls upon member states to...
2. Urges the international community to...
\`\`\`

## Position Paper Structure
1. Background
2. Country Policy
3. Proposed Solutions`,
    google_docs_url: null,
  },
  {
    id: "templates",
    slug: "templates",
    title: "Templates",
    content: `# Templates

## Chair Report Template
- Committee overview
- Key discussion points
- Resolutions passed
- Recommendations`,
    google_docs_url: null,
  },
  {
    id: "chair-report",
    slug: "chair-report",
    title: "Chair Report",
    content: `# Chair Report

Document committee proceedings and outcomes here.`,
    google_docs_url: null,
  },
];

export function GuidesView({
  guides,
  canEdit,
}: {
  guides: Guide[];
  canEdit: boolean;
}) {
  const items = guides.length > 0 ? guides : DEFAULT_GUIDES;
  const [selected, setSelected] = useState<Guide | null>(items[0] || null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createGoogleUrl, setCreateGoogleUrl] = useState("");

  const supabase = createClient();

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full shrink-0 space-y-2 lg:w-48">
        {items.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelected(g)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              selected?.id === g.id
                ? "bg-brand-accent text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        {selected && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-brand-navy shadow-sm dark:border-white/10 dark:bg-black/30 dark:text-zinc-100">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-bold">{selected.title}</h2>
              {canEdit && !editMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(true);
                    setEditTitle(selected.title);
                    setEditContent(selected.content || "");
                    setEditGoogleUrl(selected.google_docs_url?.trim() || "");
                  }}
                  className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm text-white transition-opacity duration-200 hover:opacity-95"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {!editMode ? (
              <div className="space-y-4">
                {selected.google_docs_url?.trim() ? (
                  <GoogleDocsEmbed
                    googleDocsUrl={selected.google_docs_url.trim()}
                    heading="Guide document"
                    compact
                  />
                ) : null}
                {selected.content?.trim() ? (
                  <div>
                    {selected.google_docs_url?.trim() ? (
                      <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
                        Additional notes
                      </p>
                    ) : null}
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-zinc-200">
                      {selected.content}
                    </pre>
                  </div>
                ) : !selected.google_docs_url?.trim() ? (
                  <p className="text-sm text-slate-500 dark:text-zinc-400">No content yet.</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mun-field"
                  placeholder="Title"
                />
                <div>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <label className="mun-label normal-case">Google Docs URL</label>
                    <OpenNewGoogleDocButton />
                  </div>
                  <input
                    value={editGoogleUrl}
                    onChange={(e) => setEditGoogleUrl(e.target.value)}
                    className="mun-field"
                    placeholder="https://docs.google.com/document/d/…"
                    type="url"
                  />
                  <p className="mt-1 text-xs text-brand-muted">
                    New Google Doc opens in another tab. Paste a shareable link so delegates can open the doc
                    here (view/edit depends on Google sharing).
                  </p>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="mun-field h-56 resize-y"
                  placeholder="Markdown notes (optional if you use a Google Doc)"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("guides")
                        .update({
                          title: editTitle.trim(),
                          content: editContent,
                          google_docs_url: editGoogleUrl.trim() || null,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("slug", selected.slug);
                      if (error) return;
                      const { data } = await supabase.from("guides").select("*").order("slug");
                      if (data) {
                        const nextItems =
                          (data as Guide[])?.length > 0 ? (data as Guide[]) : DEFAULT_GUIDES;
                        const nextSelected =
                          nextItems.find((g) => g.slug === selected.slug) || nextItems[0] || null;
                        setSelected(nextSelected);
                      }
                      setEditMode(false);
                    }}
                    className="mun-btn-primary"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="mun-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
            <h3 className="font-semibold text-brand-navy dark:text-zinc-100">Create new guide</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="slug (unique)"
                className="mun-field"
              />
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="title"
                className="mun-field"
              />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="mun-label normal-case">Google Docs URL (optional)</label>
                <OpenNewGoogleDocButton />
              </div>
              <input
                value={createGoogleUrl}
                onChange={(e) => setCreateGoogleUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/…"
                className="mun-field"
                type="url"
              />
            </div>
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="Markdown content (optional)"
              className="mun-field h-40 resize-y"
            />
            <button
              type="button"
              onClick={async () => {
                if (!createSlug.trim() || !createTitle.trim()) return;
                const { error } = await supabase.from("guides").upsert({
                  slug: createSlug.trim(),
                  title: createTitle.trim(),
                  content: createContent,
                  google_docs_url: createGoogleUrl.trim() || null,
                  updated_at: new Date().toISOString(),
                });
                if (error) return;
                const { data } = await supabase.from("guides").select("*").order("slug");
                if (data && Array.isArray(data) && data.length > 0) {
                  const nextItems = data as Guide[];
                  setSelected(
                    nextItems.find((g) => g.slug === createSlug.trim()) || nextItems[0] || null
                  );
                  setCreateSlug("");
                  setCreateTitle("");
                  setCreateContent("");
                  setCreateGoogleUrl("");
                }
              }}
              className="mun-btn-primary"
            >
              Create
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
