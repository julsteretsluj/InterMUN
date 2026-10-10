// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FwcCrisisDelegateClient } from "@/components/fwc/FwcCrisisDelegateClient";
import { FwcMetersStrip } from "@/components/fwc/FwcMetersStrip";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import { loadFwcChamberSnapshot, loadViewerFwcCharacterSeat } from "@/lib/fwc/load-page-context";
import {
  fwcReadDb,
  loadFwcCrisisUpdates,
  loadFwcFeed,
  loadFwcFloorRequests,
  loadFwcInventory,
  loadFwcRopBase,
  loadFwcSeatPowers,
  loadFwcSeatStatuses,
  type FwcStatusView,
} from "@/lib/fwc/rop-page-data";
import { cabinetForCountry, loadProcedureSessionStartedAt } from "@/lib/fwc/rop-state";
import { FWC_ROP } from "@/lib/rop";
import { findCharacter } from "@/lib/rop/crisis";
import { getSmtActingSeat } from "@/lib/smt-acting-seat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FwcCrisisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile?.role) redirect("/login");

  const activeConf = await resolveDashboardConferenceForUser(profile.role, user.id);
  if (!activeConf || !isFwcCommittee(activeConf.committee)) redirect("/delegate");

  const t = await getTranslations("fwcRop");
  const actingSeat = await getSmtActingSeat();
  const snapshot = await loadFwcChamberSnapshot(supabase, activeConf.id);
  const viewer = await loadViewerFwcCharacterSeat(
    supabase,
    user.id,
    snapshot.siblingConferenceIds,
    snapshot.canonicalConferenceId,
    snapshot.characterStatesByAllocationId,
    actingSeat?.allocationId
  );
  const canonical = snapshot.canonicalConferenceId;
  const db = fwcReadDb(supabase);
  const base = await loadFwcRopBase(db, canonical, snapshot.siblingConferenceIds);
  const seat = viewer.seat ? base.seats.find((s) => s.id === viewer.seat!.id) ?? null : null;
  const cabinet = seat ? cabinetForCountry(seat.country) : null;

  const [updates, feed, floor, powers, statuses, inventory, session, stateRow] = await Promise.all([
    loadFwcCrisisUpdates(db, canonical, { includeDrafts: false, viewerAllocationId: seat?.id ?? null }),
    loadFwcFeed(db, canonical),
    loadFwcFloorRequests(db, canonical, base.nameByAllocationId),
    seat ? loadFwcSeatPowers(db, canonical, seat, base.state) : Promise.resolve([]),
    seat ? loadFwcSeatStatuses(db, canonical, [seat.id]) : Promise.resolve({} as Record<string, FwcStatusView[]>),
    loadFwcInventory(db, canonical, ["public", ...(cabinet ? [cabinet] : [])]),
    loadProcedureSessionStartedAt(db, canonical),
    seat
      ? db
          .from("fwc_character_states")
          .select("base_mp, bonus_mp, mp_spent, meters")
          .eq("conference_id", canonical)
          .eq("allocation_id", seat.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const character = seat ? findCharacter(FWC_ROP, seat.country) : null;
  const metersJson = ((stateRow.data?.meters as Record<string, number> | null) ?? {}) as Record<string, number>;
  const legacy = snapshot.meters as unknown as Record<string, number>;
  const meters = (character?.meters ?? []).map((m) => ({
    key: m.key,
    label: m.label,
    max: m.max,
    value: Number(m.legacyColumn ? (legacy[m.legacyColumn] ?? 0) : (metersJson[m.key] ?? 0)),
  }));

  return (
    <MunPageShell title={t("crisisTitle")} variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">{t("crisisIntro")}</p>
      <FwcMetersStrip meters={snapshot.meters} />
      <p className="text-sm text-[#6E6E73]">
        {t("dayN", { n: base.state.crisis_day })} · {t("sessionN", { n: base.state.crisis_session })} ·{" "}
        {t("modCaucusCount", { n: base.state.mod_caucus_count })}
        {viewer.seat ? ` · ${t("seatedAs")} ${viewer.seat.displayName}` : ""}
      </p>
      <FwcCrisisDelegateClient
        conferenceId={activeConf.id}
        canonicalConferenceId={canonical}
        actingAllocationId={actingSeat && seat ? seat.id : null}
        viewer={seat && viewer.seat ? { allocationId: seat.id, displayName: viewer.seat.displayName, cabinet } : null}
        phase={session.state === "voting_procedure" ? "voting" : "debate"}
        motionRound={base.state.motion_round}
        crisisDay={base.state.crisis_day}
        updates={updates}
        feed={feed}
        floor={floor}
        powers={powers}
        assets={seat ? (findCharacter(FWC_ROP, seat.country)?.assets ?? []) : []}
        statuses={seat ? (statuses[seat.id] ?? []) : []}
        meters={meters}
        mp={
          stateRow.data
            ? {
                base: Number(stateRow.data.base_mp ?? 0),
                bonus: Number(stateRow.data.bonus_mp ?? 0),
                spent: Number(stateRow.data.mp_spent ?? 0),
              }
            : null
        }
        inventory={inventory}
        nameByAllocationId={base.nameByAllocationId}
      />
    </MunPageShell>
  );
}
