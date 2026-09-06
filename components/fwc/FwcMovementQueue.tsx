// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveFwcMovement } from "@/app/actions/fwcCrisis";
import type { FwcPostMovementAction, FwcTerrainType } from "@/lib/fwc/types";
import { labelFwcTerrain } from "@/lib/fwc/terrain";
import { FWC_POST_MOVEMENT_ACTION_LABELS } from "@/lib/fwc/ui-labels";

export type FwcMovementQueueItem = {
  id: string;
  delegateAllocationId: string;
  delegateName: string;
  currentGrid: string;
  targetGrid: string;
  baseMp: number;
  bonusMp: number;
  terrainType: FwcTerrainType;
  postMovementAction: FwcPostMovementAction;
  createdAt: string;
};

export function FwcMovementQueue({
  conferenceId,
  movements,
}: {
  conferenceId: string;
  movements: FwcMovementQueueItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function decide(movementId: string, decision: "approved" | "rejected") {
    setError(null);
    setBusyId(movementId);
    startTransition(async () => {
      const result = await resolveFwcMovement({ conferenceId, movementId, decision });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div>
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">
          Movement queue
        </h3>
        <p className="mt-1 text-sm text-[#6E6E73]">
          Approving updates the character&apos;s current grid.
        </p>
      </div>

      {movements.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-[#D1D1D6] px-4 py-6 text-center text-sm text-[#6E6E73]">
          No queued movements.
        </p>
      ) : (
        <ul className="space-y-3">
          {movements.map((row) => {
            const busy = pending && busyId === row.id;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-[12px] border border-[#D1D1D6] bg-[#F2F2F7]/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-[#1D1D1F]">{row.delegateName}</p>
                  <p className="text-sm text-[#6E6E73]">
                    {row.currentGrid} → {row.targetGrid}
                    {" · "}
                    {labelFwcTerrain(row.terrainType)}
                    {" · "}
                    MP {row.baseMp}
                    {row.bonusMp > 0 ? `+${row.bonusMp}` : ""}
                    {" · "}
                    {FWC_POST_MOVEMENT_ACTION_LABELS[row.postMovementAction]}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide(row.id, "rejected")}
                    className="rounded-[980px] border border-[#D1D1D6] bg-white px-4 py-2 text-sm font-semibold text-[#1D1D1F] disabled:opacity-50"
                  >
                    {busy ? "…" : "Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => decide(row.id, "approved")}
                    className="rounded-[980px] bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077ED] disabled:opacity-50"
                  >
                    {busy ? "…" : "Approve"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p className="text-sm text-[#B71C1C]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
