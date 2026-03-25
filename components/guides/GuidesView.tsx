"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Guide {
  id: string;
  slug: string;
  title: string;
  content: string | null;
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
  },
  {
    id: "chair-report",
    slug: "chair-report",
    title: "Chair Report",
    content: `# Chair Report

Document committee proceedings and outcomes here.`,
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
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");

  const supabase = createClient();

  return (
    <div className="flex gap-6">
      <div className="w-48 shrink-0 space-y-2">
        {items.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g)}
            className={`block w-full text-left px-3 py-2 rounded ${
              selected?.id === g.id
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {selected && (
          <div className="prose dark:prose-invert max-w-none bg-white dark:bg-slate-800 rounded-lg p-6 border dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold mb-4">{selected.title}</h2>
              {canEdit && !editMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(true);
                    setEditTitle(selected.title);
                    setEditContent(selected.content || "");
                  }}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {!editMode ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {selected.content || "No content yet."}
              </pre>
            ) : (
              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded dark:bg-slate-700"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-56 px-3 py-2 border rounded dark:bg-slate-700"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("guides")
                        .update({
                          title: editTitle.trim(),
                          content: editContent,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("slug", selected.slug);
                      if (error) return;
                      const { data } = await supabase
                        .from("guides")
                        .select("*")
                        .order("slug");
                      if (data) {
                        const nextItems = (data as Guide[])?.length > 0 ? (data as Guide[]) : DEFAULT_GUIDES;
                        const nextSelected = nextItems.find((g) => g.slug === selected.slug) || nextItems[0] || null;
                        setSelected(nextSelected);
                      }
                      setEditMode(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <div className="mt-6 p-4 border rounded-lg dark:border-slate-700 space-y-3 bg-white/10">
            <h3 className="font-semibold">Create new guide</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="slug (unique)"
                className="px-3 py-2 border rounded dark:bg-slate-700"
              />
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="title"
                className="px-3 py-2 border rounded dark:bg-slate-700"
              />
            </div>
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder="Markdown content..."
              className="w-full h-40 px-3 py-2 border rounded dark:bg-slate-700"
            />
            <button
              type="button"
              onClick={async () => {
                if (!createSlug.trim() || !createTitle.trim()) return;
                const { error } = await supabase.from("guides").upsert({
                  slug: createSlug.trim(),
                  title: createTitle.trim(),
                  content: createContent,
                  updated_at: new Date().toISOString(),
                });
                if (error) return;
                const { data } = await supabase
                  .from("guides")
                  .select("*")
                  .order("slug");
                if (data && Array.isArray(data) && data.length > 0) {
                  const nextItems = data as Guide[];
                  setSelected(nextItems.find((g) => g.slug === createSlug.trim()) || nextItems[0] || null);
                  setCreateSlug("");
                  setCreateTitle("");
                  setCreateContent("");
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Create
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
