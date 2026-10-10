// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loadFwcResults } from "@/app/actions/fwcRop";
import { FwcControlClient, type FwcControlSeat } from "@/components/fwc/FwcControlClient";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import { isFwcCharacterSeat } from "@/lib/fwc/actor";
import { loadFwcChamberSnapshot } from "@/lib/fwc/load-page-context";
import {
  fwcReadDb,
  loadFwcCrisisUpdates,
  loadFwcFloorRequests,
  loadFwcInventory,
  loadFwcRopBase,
  loadFwcSeatPowers,
  loadFwcSeatStatuses,
} from "@/lib/fwc/rop-page-data";
import { cabinetForCountry } from "@/lib/fwc/rop-state";
import { FWC_ROP } from "@/lib/rop";
import { findCharacter } from "@/lib/rop/crisis";
import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChairFwcControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isStaffRole(profile?.role)) redirect("/delegate");

  const activeConf = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!activeConf || !isFwcCommittee(activeConf.committee)) redirect("/chair");

  const t = await getTranslations("fwcRop");
  const snapshot = await loadFwcChamberSnapshot(supabase, activeConf.id);
  const canonical = snapshot.canonicalConferenceId;
  const db = fwcReadDb(supabase);
  const base = await loadFwcRopBase(db, canonical, snapshot.siblingConferenceIds);
  const characterSeats = base.seats.filter((s) => isFwcCharacterSeat(s.country));

  const [updates, floor, inventory, statuses, uses, states, results, powersBySeat] = await Promise.all([
    loadFwcCrisisUpdates(db, canonical, { includeDrafts: true, viewerAllocationId: null, limit: 20 }),
    loadFwcFloorRequests(db, canonical, base.nameByAllocationId),
    loadFwcInventory(db, canonical, null),
    loadFwcSeatStatuses(db, canonical, null),
    db
      .from("fwc_power_uses")
      .select("id, allocation_id, power_key, crisis_day, crisis_session, note, created_at")
      .eq("conference_id", canonical)
      .eq("voided", false)
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("fwc_character_states").select("allocation_id, meters").eq("conference_id", canonical),
    loadFwcResults(activeConf.id),
    Promise.all(characterSeats.map((s) => loadFwcSeatPowers(db, canonical, s, base.state))),
  ]);

  const legacy = snapshot.meters as unknown as Record<string, number>;
  const metersJsonBySeat = new Map(
    (states.data ?? []).map((r) => [String(r.allocation_id), (r.meters as Record<string, number> | null) ?? {}])
  );

  const seats: FwcControlSeat[] = characterSeats
    .map((s, i) => {
      const character = findCharacter(FWC_ROP, s.country);
      const json = metersJsonBySeat.get(s.id) ?? {};
      return {
        allocationId: s.id,
        name: base.nameByAllocationId[s.id] ?? String(s.country),
        cabinet: cabinetForCountry(s.country),
        powers: powersBySeat[i] ?? [],
        statuses: statuses[s.id] ?? [],
        uses: (uses.data ?? [])
          .filter((u) => u.allocation_id === s.id)
          .map((u) => ({
            id: String(u.id),
            powerKey: String(u.power_key),
            label: character?.powers.find((p) => p.key === u.power_key)?.label ?? String(u.power_key),
            crisisDay: Number(u.crisis_day),
            crisisSession: Number(u.crisis_session),
            note: (u.note as string | null) ?? null,
            createdAt: String(u.created_at),
          })),
        meters: (character?.meters ?? []).map((m) => ({
          key: m.key,
          label: m.label,
          max: m.max,
          value: Number(m.legacyColumn ? (legacy[m.legacyColumn] ?? 0) : (json[m.key] ?? 0)),
        })),
      };
    })
    .sort((a, b) => (a.cabinet ?? "").localeCompare(b.cabinet ?? "") || a.name.localeCompare(b.name));

  return (
    <MunPageShell title={t("controlTitle")} variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">{t("controlIntro")}</p>
      {snapshot.ensureError ? (
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#B71C1C]">
          {snapshot.ensureError}
        </p>
      ) : null}
      <FwcControlClient
        conferenceId={activeConf.id}
        canonicalConferenceId={canonical}
        state={{
          crisisDay: base.state.crisis_day,
          crisisSession: base.state.crisis_session,
          modCaucusCount: base.state.mod_caucus_count,
          motionRound: base.state.motion_round,
          isLastSession: base.state.is_last_session,
          clockPaused: base.state.clock_paused,
        }}
        updates={updates}
        floor={floor}
        inventory={inventory}
        seats={seats}
        results={results.ok ? results.data.rows : []}
        nameByAllocationId={base.nameByAllocationId}
      />
    </MunPageShell>
  );
}
