// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { queueFwcMovement } from "@/app/actions/fwcCrisis";
import {
  FWC_POST_MOVEMENT_ACTIONS,
  FWC_TERRAIN_TYPES,
  type FwcPostMovementAction,
  type FwcTerrainType,
} from "@/lib/fwc/types";
import { FWC_TERRAIN_LABELS, fwcTerrainMpCost } from "@/lib/fwc/terrain";
import { FWC_POST_MOVEMENT_ACTION_LABELS } from "@/lib/fwc/ui-labels";

export function FwcMovementForm({
  conferenceId,
  currentGrid,
  baseMp,
  bonusMp,
  hasQueuedMovement,
  targetGridHint = null,
}: {
  conferenceId: string;
  currentGrid: string;
  baseMp: number;
  bonusMp: number;
  hasQueuedMovement: boolean;
  /** When set (e.g. from map cell click), fills the target grid field. */
  targetGridHint?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [targetGrid, setTargetGrid] = useState("");
  const [terrainType, setTerrainType] = useState<FwcTerrainType>("road_pavement");
  const [postMovementAction, setPostMovementAction] =
    useState<FwcPostMovementAction>("none");

  useEffect(() => {
    if (!targetGridHint || hasQueuedMovement) return;
    setTargetGrid(targetGridHint);
  }, [targetGridHint, hasQueuedMovement]);

  const totalMp = baseMp + bonusMp;
  const terrainCost = fwcTerrainMpCost(terrainType);
  const enterableTerrains = useMemo(
    () => FWC_TERRAIN_TYPES.filter((t) => t !== "impassable"),
    []
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await queueFwcMovement({
        conferenceId,
        targetGrid,
        terrainType,
        postMovementAction,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTargetGrid("");
      setTerrainType("road_pavement");
      setPostMovementAction("none");
      setNotice("Movement queued for chair approval.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">Queue movement</h3>
        <p className="mt-1 text-sm text-[#6E6E73]">
          Current grid <span className="font-semibold text-[#1D1D1F]">{currentGrid}</span>
          {" · "}
          MP pool{" "}
          <span className="font-semibold tabular-nums text-[#1D1D1F]">
            {baseMp}
            {bonusMp > 0 ? ` + ${bonusMp} road bonus` : ""} = {totalMp}
          </span>
        </p>
      </div>

      {hasQueuedMovement ? (
        <p className="rounded-[12px] bg-[#FFF8E1] px-3 py-2 text-sm text-[#E65100]">
          You already have a movement waiting for Backroom approval.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Target grid
          </span>
          <input
            required
            value={targetGrid}
            onChange={(e) => setTargetGrid(e.target.value)}
            disabled={pending || hasQueuedMovement}
            className="mun-field w-full"
            placeholder="e.g. C4"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
            Destination terrain
          </span>
          <select
            value={terrainType}
            onChange={(e) => setTerrainType(e.target.value as FwcTerrainType)}
            disabled={pending || hasQueuedMovement}
            className="mun-field w-full"
          >
            {enterableTerrains.map((t) => (
              <option key={t} value={t}>
                {FWC_TERRAIN_LABELS[t]}
                {fwcTerrainMpCost(t) != null ? ` (${fwcTerrainMpCost(t)} MP)` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-[#6E6E73]">
        Entering this tile costs{" "}
        <span className="font-semibold tabular-nums text-[#1D1D1F]">
          {terrainCost == null ? "—" : `${terrainCost} MP`}
        </span>
        . Chairs validate path length against your remaining pool.
      </p>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#6E6E73]">
          After moving
        </span>
        <select
          value={postMovementAction}
          onChange={(e) => setPostMovementAction(e.target.value as FwcPostMovementAction)}
          disabled={pending || hasQueuedMovement}
          className="mun-field w-full"
        >
          {FWC_POST_MOVEMENT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {FWC_POST_MOVEMENT_ACTION_LABELS[action]}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="text-sm text-[#B71C1C]" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-[#1B5E20]" role="status">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || hasQueuedMovement}
        className="inline-flex items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0077ED] disabled:opacity-60"
      >
        {pending ? "Queuing…" : "Queue movement"}
      </button>
    </form>
  );
}
