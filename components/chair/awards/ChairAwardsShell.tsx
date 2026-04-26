"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "min-w-0 flex-1 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm transition-apple sm:flex-initial",
        tab === id
          ? "bg-[var(--material-thick)] font-semibold text-brand-navy shadow-sm"
          : "font-medium text-brand-muted"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div
        className="inline-flex w-full max-w-full flex-wrap gap-0.5 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] p-0.5"
        role="tablist"
        aria-label="Chair awards"
      >
        {btn("score", "Score & nominations", "tab-chair-score")}
        {btn("rubric", "Rubric reference", "tab-chair-rubric")}
      </div>
      <div role="tabpanel" aria-labelledby={tab === "score" ? "tab-chair-score" : "tab-chair-rubric"}>
        {tab === "score" ? score : rubric}
      </div>
    </div>
  );
}
