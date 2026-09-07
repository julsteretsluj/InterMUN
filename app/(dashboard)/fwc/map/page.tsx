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
import { buildFwcBoardEvidenceMarkers } from "@/lib/fwc/evidence-location";
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
  const showEvidenceOnMap = effectiveRole === "chair";

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
  const { data: heldRows } = await supabase
    .from("fwc_evidence_items")
    .select("held_by_allocation_id")
    .eq("conference_id", snapshot.canonicalConferenceId)
    .not("held_by_allocation_id", "is", null);
  for (const row of heldRows ?? []) {
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

  let evidenceMarkers: ReturnType<typeof buildFwcBoardEvidenceMarkers> = [];
  if (showEvidenceOnMap) {
    const { data: evidenceRows } = await supabase
      .from("fwc_evidence_items")
      .select(
        "id, slug, title, starting_location, current_location, held_by_allocation_id"
      )
      .eq("conference_id", snapshot.canonicalConferenceId)
      .order("slug", { ascending: true });

    const holderGridByAllocationId: Record<string, string> = {};
    for (const character of characters) {
      holderGridByAllocationId[character.allocationId] = character.currentGrid;
    }

    evidenceMarkers = buildFwcBoardEvidenceMarkers(
      (evidenceRows ?? []).map((row) => ({
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        title: String(row.title ?? ""),
        startingLocation: String(row.starting_location ?? ""),
        currentLocation: String(row.current_location ?? row.starting_location ?? ""),
        heldByAllocationId:
          typeof row.held_by_allocation_id === "string" ? row.held_by_allocation_id : null,
      })),
      holderGridByAllocationId
    );
  }

  return (
    <MunPageShell title="Hawkins map" variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">
        Parallel tactical board for Hawkins / the Upside Down. Markers show every seated
        character’s live grid from crisis state — positions are shared on the floor, not
        anonymous.
        {showEvidenceOnMap
          ? " Evidence badges (squared) are chair-only so the dais can see where every catalog item sits or who holds it."
          : ""}
      </p>

      {snapshot.ensureError ? (
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#B71C1C]">
          {snapshot.ensureError}
        </p>
      ) : null}

      <FwcMetersStrip meters={snapshot.meters} />

      <FwcMapClient
        characters={characters}
        evidenceMarkers={evidenceMarkers}
        highlightAllocationId={viewer.seat?.id ?? null}
      />
    </MunPageShell>
  );
}
