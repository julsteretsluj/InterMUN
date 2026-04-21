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
  staffRole,
}: {
  allocations: AllocationRow[];
  delegates: DelegateOption[];
  chairs: ChairOption[];
  staffRole: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const normalizedRole = staffRole.trim().toLowerCase();
  const canEditOverrides = normalizedRole === "smt" || normalizedRole === "admin";

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

    const payload: {
      user_id: string | null;
      display_name_override?: string | null;
      display_pronouns_override?: string | null;
      display_school_override?: string | null;
    } = {
      user_id: draft.user_id || null,
    };

    if (canEditOverrides) {
      const name = draft.display_name_override.trim();
      const pronouns = draft.display_pronouns_override.trim();
      const school = draft.display_school_override.trim();
      payload.display_name_override = name || null;
      payload.display_pronouns_override = pronouns || null;
      payload.display_school_override = school || null;
    }

    const { error } = await supabase.from("allocations").update(payload).eq("id", allocationId);

    if (error) return;
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-5 md:p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-brand-navy">
        Seat controls
      </h2>
      <p className="text-sm text-brand-muted">
        Update who&apos;s assigned to each seat.
        {canEditOverrides
          ? " SMT and admins can also override placard text fields for this committee."
          : " Placard text overrides are limited to SMT/admin."}
      </p>

      <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">Country / position</th>
              <th className="px-3 py-2 w-[220px]">Delegate (vacant ok)</th>
              {canEditOverrides ? (
                <>
                  <th className="px-3 py-2 w-[170px]">Name override</th>
                  <th className="px-3 py-2 w-[190px]">Pronouns override</th>
                  <th className="px-3 py-2 w-[190px]">School override</th>
                </>
              ) : null}
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
                      className="w-full px-2 py-1 rounded border border-brand-navy/15 bg-black/25 text-sm"
                    >
                      <option value="">Vacant</option>
                      {(isChairSeat(a.country) ? chairOptions : delegateOptions).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name || opt.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  {canEditOverrides ? (
                    <>
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
                    </>
                  ) : null}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void saveAllocation(a.id)}
                      className="px-3 py-1 rounded bg-brand-paper text-brand-navy text-xs font-medium hover:opacity-90"
                    >
                      {canEditOverrides ? "Save" : "Save seat"}
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

