"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type DelegateOption = { id: string; name: string | null };
type ChairOption = { id: string; name: string | null };

type AllocationRow = {
  id: string;
  country: string | null;
  user_id: string | null;
  display_name_override: string | null;
  display_pronouns_override: string | null;
  display_school_override: string | null;
};

export function CommitteeRoomStaffControls({
  allocations,
  delegates,
  chairs,
}: {
  allocations: AllocationRow[];
  delegates: DelegateOption[];
  chairs: ChairOption[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const delegateOptions = useMemo(
    () => delegates.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [delegates]
  );
  const chairOptions = useMemo(
    () => chairs.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [chairs]
  );

  function isChairSeat(country: string | null) {
    const k = (country ?? "").trim().toLowerCase();
    return k === "head chair" || k === "co-chair" || k === "co chair";
  }

  const [drafts, setDrafts] = useState<Record<string, {
    user_id: string | null;
    display_name_override: string;
    display_pronouns_override: string;
    display_school_override: string;
  }>>(() => {
    return Object.fromEntries(
      allocations.map((a) => [
        a.id,
        {
          user_id: a.user_id,
          display_name_override: a.display_name_override || "",
          display_pronouns_override: a.display_pronouns_override || "",
          display_school_override: a.display_school_override || "",
        },
      ])
    );
  });

  async function saveAllocation(allocationId: string) {
    const draft = drafts[allocationId];
    if (!draft) return;

    const name = draft.display_name_override.trim();
    const pronouns = draft.display_pronouns_override.trim();
    const school = draft.display_school_override.trim();

    const { error } = await supabase.from("allocations").update({
      user_id: draft.user_id || null,
      display_name_override: name || null,
      display_pronouns_override: pronouns || null,
      display_school_override: school || null,
    }).eq("id", allocationId);

    if (error) return;
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-brand-navy">
        Seat controls (vacancy + overrides)
      </h2>
      <p className="text-sm text-brand-muted">
        Update who’s assigned to each seat, and optionally override the placard text fields for this committee.
      </p>

      <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">Country / position</th>
              <th className="px-3 py-2 w-[220px]">Delegate (vacant ok)</th>
              <th className="px-3 py-2 w-[170px]">Name override</th>
              <th className="px-3 py-2 w-[190px]">Pronouns override</th>
              <th className="px-3 py-2 w-[190px]">School override</th>
              <th className="px-3 py-2 w-[120px]">Save</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => {
              const d = drafts[a.id];
              if (!d) return null;
              return (
                <tr key={a.id} className="border-t border-brand-navy/5">
                  <td className="px-3 py-2 font-medium text-brand-navy">{a.country || "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      value={d.user_id || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [a.id]: { ...prev[a.id], user_id: v ? v : null },
                        }));
                      }}
                      className="w-full px-2 py-1 rounded border border-brand-navy/15 bg-white text-sm"
                    >
                      <option value="">Vacant</option>
                      {(isChairSeat(a.country) ? chairOptions : delegateOptions).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name || opt.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={d.display_name_override}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [a.id]: { ...prev[a.id], display_name_override: v },
                        }));
                      }}
                      className="w-full px-2 py-1 rounded border border-brand-navy/15 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={d.display_pronouns_override}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [a.id]: { ...prev[a.id], display_pronouns_override: v },
                        }));
                      }}
                      className="w-full px-2 py-1 rounded border border-brand-navy/15 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={d.display_school_override}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [a.id]: { ...prev[a.id], display_school_override: v },
                        }));
                      }}
                      className="w-full px-2 py-1 rounded border border-brand-navy/15 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void saveAllocation(a.id)}
                      className="px-3 py-1 rounded bg-brand-paper text-brand-navy text-xs font-medium hover:opacity-90"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

