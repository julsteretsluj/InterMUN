// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { FwcMapClient } from "@/components/fwc/FwcMapClient";
import { FwcMetersStrip } from "@/components/fwc/FwcMetersStrip";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import {
  loadFwcChamberSnapshot,
  loadViewerFwcCharacterSeat,
} from "@/lib/fwc/load-page-context";
import { lookupFwcCharacter } from "@/lib/fwc/characters";
import { labelFwcTerrain } from "@/lib/fwc/terrain";
import { FWC_POST_MOVEMENT_ACTION_LABELS } from "@/lib/fwc/ui-labels";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FwcMovementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.role) redirect("/login");

  const myRole = profile.role.toString().toLowerCase();
  const smtSurface = myRole === "smt" ? await getSmtDashboardSurface() : null;
  const effectiveRole = String(
    effectiveDashboardRole(myRole, smtSurface) ?? myRole
  ).toLowerCase();

  const activeConf = await resolveDashboardConferenceForUser(profile.role, user.id);
  if (!activeConf || !isFwcCommittee(activeConf.committee)) {
    if (effectiveRole === "chair") redirect("/chair");
    if (myRole === "smt" || myRole === "admin") redirect("/smt");
    redirect("/delegate");
  }

  const snapshot = await loadFwcChamberSnapshot(supabase, activeConf.id, {
    movementStatuses: ["queued", "approved", "rejected"],
  });
  const viewer = await loadViewerFwcCharacterSeat(
    supabase,
    user.id,
    snapshot.siblingConferenceIds,
    snapshot.canonicalConferenceId,
    snapshot.characterStatesByAllocationId
  );

  const myMovements = viewer.seat
    ? snapshot.movements.filter((row) => row.delegateAllocationId === viewer.seat!.id)
    : [];
  const hasQueued = myMovements.some((row) => row.status === "queued");

  const characters = snapshot.seats.map((seat) => {
    const catalog = lookupFwcCharacter(seat.country);
    const state = snapshot.characterStatesByAllocationId[seat.id];
    return {
      allocationId: seat.id,
      country: seat.country,
      displayName: seat.displayName,
      currentGrid: state?.currentGrid || catalog?.baseGrid || "?",
      baseMp: state?.baseMp ?? catalog?.baseMp ?? 0,
      bonusMp: state?.bonusMp ?? catalog?.bonusMp ?? 0,
    };
  });

  return (
    <MunPageShell title="FWC movement" variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">
        Queue a grid move for chair approval. Terrain costs come from the RoP table; chairs validate
        path length against your MP pool. Tap a board cell to fill your target grid.
      </p>

      {snapshot.ensureError ? (
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#B71C1C]">
          {snapshot.ensureError}
        </p>
      ) : null}

      <FwcMetersStrip meters={snapshot.meters} />

      <FwcMapClient
        characters={characters}
        highlightAllocationId={viewer.seat?.id ?? null}
        showMovementForm={Boolean(viewer.seat && viewer.state)}
        movementForm={
          viewer.seat && viewer.state
            ? {
                conferenceId: activeConf.id,
                currentGrid: viewer.state.currentGrid,
                baseMp: viewer.state.baseMp,
                bonusMp: viewer.state.bonusMp,
                hasQueuedMovement: hasQueued,
              }
            : null
        }
      />

      {!viewer.seat || !viewer.state ? (
        <p className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-white px-5 py-6 text-sm text-[#6E6E73]">
          You need an FWC character seat to queue movement.
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">Your movements</h3>
        {myMovements.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-white px-5 py-8 text-center text-sm text-[#6E6E73]">
            No movements yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {myMovements.map((row) => (
              <li
                key={row.id}
                className="rounded-[16px] border border-[#D1D1D6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                <p className="font-semibold text-[#1D1D1F]">
                  {row.currentGrid} → {row.targetGrid}
                </p>
                <p className="mt-1 text-sm text-[#6E6E73]">
                  {labelFwcTerrain(row.terrainType)} ·{" "}
                  {FWC_POST_MOVEMENT_ACTION_LABELS[row.postMovementAction]} ·{" "}
                  <span className="capitalize">{row.status}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MunPageShell>
  );
}
