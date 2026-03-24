"use client";

import { useState } from "react";

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

export function GuidesView({ guides }: { guides: Guide[] }) {
  const items = guides.length > 0 ? guides : DEFAULT_GUIDES;
  const [selected, setSelected] = useState<Guide | null>(items[0] || null);

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
            <h2 className="text-xl font-bold mb-4">{selected.title}</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {selected.content || "No content yet."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
