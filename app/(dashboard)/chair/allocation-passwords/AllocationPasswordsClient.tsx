"use client";

import { useMemo, useState } from "react";
import { HelpButton } from "@/components/HelpButton";

type Row = {
  allocationId: string;
  country: string;
  delegateUserId: string | null;
  code: string;
};

export function AllocationPasswordsClient({
  conferenceLabel,
  rows: initialRows,
}: {
  conferenceId: string;
  conferenceLabel: string;
  rows: Row[];
}) {
  const [message, setMessage] = useState<string | null>(null);

  const listText = useMemo(() => {
    return initialRows
      .map((r) => {
        const code = r.code ?? "";
        const delegateId = r.delegateUserId ?? "—";
        return `${r.country}\t${delegateId}\t${code || "—"}`;
      })
      .join("\n");
  }, [initialRows]);

  function copyList() {
    void navigator.clipboard.writeText(
      `Conference: ${conferenceLabel}\nCountry\tDelegate\tCode\n${listText}`
    );
    setMessage("Copied table to clipboard.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyList}
          disabled={initialRows.length === 0}
          className="px-3 py-2 text-sm rounded-lg border border-brand-navy/20 text-brand-navy font-medium hover:bg-brand-cream disabled:opacity-50"
        >
          Copy list (TSV)
        </button>
        <HelpButton title="Allocation sign-in codes">
          These are per-allocation placard codes used by delegates and chairs during the allocation-code
          gate. Codes can only be changed by a site admin.
        </HelpButton>
      </div>

      {message && (
        <p className="text-sm text-brand-navy bg-brand-accent/10 border border-brand-accent/22 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-navy/10 bg-brand-paper">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-brand-navy/10 bg-brand-cream/80">
              <th className="px-3 py-2 font-semibold text-brand-navy">Country / allocation</th>
              <th className="px-3 py-2 font-semibold text-brand-navy">Delegate (allocation)</th>
              <th className="px-3 py-2 font-semibold text-brand-navy w-[min(40%,14rem)]">
                <span className="inline-flex items-center gap-1.5">
                  Password / code
                  <HelpButton title="Password / code field">
                    Delegates enter this code for their assigned allocation. Only a site admin can change
                    it.
                  </HelpButton>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-brand-muted text-center">
                  No allocations for this conference yet.
                </td>
              </tr>
            ) : (
              initialRows.map((r) => (
                <tr key={r.allocationId} className="border-b border-brand-navy/5">
                  <td className="px-3 py-2 font-medium text-brand-navy align-top">{r.country}</td>
                  <td className="px-3 py-2 text-brand-muted align-top">{r.delegateUserId ?? "—"}</td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-brand-navy/90">
                    {r.code?.trim() ? r.code : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
