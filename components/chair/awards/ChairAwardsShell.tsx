"use client";

import { useState } from "react";

export function ChairAwardsShell({
  score,
  rubric,
}: {
  score: React.ReactNode;
  rubric: React.ReactNode;
}) {
  const [tab, setTab] = useState<"score" | "rubric">("score");

  const btn = (id: "score" | "rubric", label: string, domId: string) => (
    <button
      id={domId}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        tab === id
          ? "border-brand-accent text-brand-navy bg-brand-paper"
          : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label="Chair awards">
        {btn("score", "Score & nominations", "tab-chair-score")}
        {btn("rubric", "Rubric reference", "tab-chair-rubric")}
      </div>
      <div role="tabpanel" aria-labelledby={tab === "score" ? "tab-chair-score" : "tab-chair-rubric"}>
        {tab === "score" ? score : rubric}
      </div>
    </div>
  );
}
