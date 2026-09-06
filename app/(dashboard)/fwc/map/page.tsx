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
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FwcMapPage() {
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

  const snapshot = await loadFwcChamberSnapshot(supabase, activeConf.id);
  const viewer = await loadViewerFwcCharacterSeat(
    supabase,
    user.id,
    snapshot.siblingConferenceIds,
    snapshot.canonicalConferenceId,
    snapshot.characterStatesByAllocationId
  );

  const heldCounts = new Map<string, number>();
  const { data: evidenceRows } = await supabase
    .from("fwc_evidence_items")
    .select("held_by_allocation_id")
    .eq("conference_id", snapshot.canonicalConferenceId)
    .not("held_by_allocation_id", "is", null);
  for (const row of evidenceRows ?? []) {
    const id = String(row.held_by_allocation_id ?? "");
    if (!id) continue;
    heldCounts.set(id, (heldCounts.get(id) ?? 0) + 1);
  }

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
      heldEvidenceCount: heldCounts.get(seat.id) ?? 0,
    };
  });

  return (
    <MunPageShell title="Hawkins map" variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">
        Parallel tactical board for Hawkins / the Upside Down. Markers show every seated
        character’s live grid from crisis state — positions are shared on the floor, not
        anonymous.
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
      />
    </MunPageShell>
  );
}
