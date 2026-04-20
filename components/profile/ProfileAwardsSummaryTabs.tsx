"use client";

import { useState } from "react";

/** When both delegate flows exist, tab between pending nominations and recorded assignments. */
export function ProfileAwardsSummaryTabs({
  pendingSlot,
  recordedSlot,
}: {
  pendingSlot: React.ReactNode;
  recordedSlot: React.ReactNode;
}) {
  const [tab, setTab] = useState<"pending" | "recorded">("pending");

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label="Awards on your profile">
        <button
          id="tab-profile-pending-noms"
          type="button"
          role="tab"
          aria-selected={tab === "pending"}
          onClick={() => setTab("pending")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "pending"
              ? "border-brand-accent text-brand-navy bg-brand-paper"
              : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
          }`}
        >
          Pending nominations
        </button>
        <button
          id="tab-profile-recorded-awards"
          type="button"
          role="tab"
          aria-selected={tab === "recorded"}
          onClick={() => setTab("recorded")}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "recorded"
              ? "border-brand-accent text-brand-navy bg-brand-paper"
              : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
          }`}
        >
          Recorded awards
        </button>
      </div>
      <div role="tabpanel" aria-labelledby={tab === "pending" ? "tab-profile-pending-noms" : "tab-profile-recorded-awards"}>
        {tab === "pending" ? pendingSlot : recordedSlot}
      </div>
    </div>
  );
}
