"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveAllocationCode,
  generateMissingAllocationCodes,
} from "@/app/actions/allocationCodes";
import { HelpButton } from "@/components/HelpButton";

type Row = {
  allocationId: string;
  country: string;
  delegateUserId: string | null;
  code: string;
};

export function AllocationPasswordsClient({
  conferenceId,
  conferenceLabel,
  rows: initialRows,
}: {
  conferenceId: string;
  conferenceLabel: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [codes, setCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRows.map((r) => [r.allocationId, r.code]))
  );
  const rowsFingerprint = useMemo(
    () =>
      initialRows
        .map((r) => `${r.allocationId}:${r.code}`)
        .sort()
        .join("|"),
    [initialRows]
  );
  useEffect(() => {
    setCodes(Object.fromEntries(initialRows.map((r) => [r.allocationId, r.code])));
    // rowsFingerprint: only re-sync when allocation codes from server change (after refresh), not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialRows identity is unstable from RSC
  }, [rowsFingerprint]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const listText = useMemo(() => {
    return initialRows
      .map((r) => {
        const code = codes[r.allocationId] ?? "";
        const delegateId = r.delegateUserId ?? "—";
        return `${r.country}\t${delegateId}\t${code || "—"}`;
      })
      .join("\n");
  }, [initialRows, codes]);

  function copyList() {
    void navigator.clipboard.writeText(
      `Conference: ${conferenceLabel}\nCountry\tDelegate\tCode\n${listText}`
    );
    setMessage("Copied table to clipboard.");
    setError(null);
  }

  function saveRow(allocationId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveAllocationCode(allocationId, codes[allocationId] ?? "");
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  }

  function generateMissing() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await generateMissingAllocationCodes(conferenceId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setMessage(
        res.generated
          ? `Generated ${res.generated} new code(s).`
          : "Every allocation already has a code."
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generateMissing}
          disabled={pending || initialRows.length === 0}
          className="px-3 py-2 text-sm rounded-lg bg-brand-gold text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          Generate codes for empty rows
        </button>
        <button
          type="button"
          onClick={copyList}
          disabled={initialRows.length === 0}
          className="px-3 py-2 text-sm rounded-lg border border-brand-navy/20 text-brand-navy font-medium hover:bg-brand-cream disabled:opacity-50"
        >
          Copy list (TSV)
        </button>
        <HelpButton title="Allocation sign-in codes">
          These are per-allocation placard codes used by delegates/chairs during allocation-code gate. Generate fills
          missing codes only.
        </HelpButton>
      </div>

      {message && (
        <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
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
                    Use short alphanumeric codes. Delegates enter this code for their assigned allocation.
                  </HelpButton>
                </span>
              </th>
              <th className="px-3 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-brand-muted text-center">
                  No allocations for this conference yet.
                </td>
              </tr>
            ) : (
              initialRows.map((r) => (
                <tr key={r.allocationId} className="border-b border-brand-navy/5">
                  <td className="px-3 py-2 font-medium text-brand-navy align-top">
                    {r.country}
                  </td>
                  <td className="px-3 py-2 text-brand-muted align-top">
                    {r.delegateUserId ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      value={codes[r.allocationId] ?? ""}
                      onChange={(e) =>
                        setCodes((prev) => ({
                          ...prev,
                          [r.allocationId]: e.target.value,
                        }))
                      }
                      className="w-full min-w-[8rem] px-2 py-1.5 rounded-md border border-brand-navy/15 bg-black/25 font-mono text-xs"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => saveRow(r.allocationId)}
                      disabled={pending}
                      className="text-xs font-medium text-brand-gold hover:underline disabled:opacity-50"
                    >
                      Save
                    </button>
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
