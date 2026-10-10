// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listFwcDirectiveWorkspace } from "@/app/actions/fwcDirectives";
import { FwcDirectiveWorkspace } from "@/components/fwc/FwcDirectiveWorkspace";
import { FwcMetersStrip } from "@/components/fwc/FwcMetersStrip";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import {
  loadFwcChamberSnapshot,
  loadViewerFwcCharacterSeat,
} from "@/lib/fwc/load-page-context";
import {
  fwcReadDb,
  loadFwcCitationContext,
  loadFwcDelegateDirectiveGate,
  loadFwcRopBase,
} from "@/lib/fwc/rop-page-data";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
import { getSmtActingSeat } from "@/lib/smt-acting-seat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FwcDirectivesPage() {
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

  const actingAllocationId = actingSeat && viewer.seat ? viewer.seat.id : null;
  const listed = await listFwcDirectiveWorkspace({ conferenceId: activeConf.id, actingAllocationId });

  const db = fwcReadDb(supabase);
  const base = await loadFwcRopBase(db, snapshot.canonicalConferenceId, snapshot.siblingConferenceIds);
  const viewerSeatRow = viewer.seat ? base.seats.find((s) => s.id === viewer.seat!.id) ?? null : null;
  const [citations, gate] = await Promise.all([
    loadFwcCitationContext(db, snapshot.canonicalConferenceId, base.seats, base.state),
    viewerSeatRow
      ? loadFwcDelegateDirectiveGate(db, snapshot.canonicalConferenceId, viewerSeatRow, base.state)
      : { activeCrisis: false, blockedByStatus: null, anonymityUsedThisSession: false },
  ]);

  const coAuthorOptions = snapshot.seats
    .filter((seat) => seat.id !== viewer.seat?.id)
    .map((seat) => ({ id: seat.id, label: seat.displayName }));

  return (
    <MunPageShell title={t("directivesTitle")} variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">{t("directivesIntro")}</p>

      {snapshot.ensureError ? (
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#B71C1C]">
          {snapshot.ensureError}
        </p>
      ) : null}
      {!listed.ok ? (
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#B71C1C]">
          {listed.error}
        </p>
      ) : null}

      <FwcMetersStrip meters={snapshot.meters} />

      {viewer.seat && viewer.state ? (
        <p className="text-sm text-[#6E6E73]">
          {t("seatedAs")} <span className="font-semibold text-[#1D1D1F]">{viewer.seat.displayName}</span>
          {" · "}
          {t("gridX", { grid: viewer.state.currentGrid })}
          {" · "}
          {t("dayN", { n: base.state.crisis_day })} · {t("sessionN", { n: base.state.crisis_session })}
          {actingAllocationId ? ` · ${t("actingForSeat")}` : ""}
        </p>
      ) : null}

      <FwcDirectiveWorkspace
        conferenceId={activeConf.id}
        canonicalConferenceId={snapshot.canonicalConferenceId}
        actingAllocationId={actingAllocationId}
        viewer={
          viewer.seat
            ? {
                allocationId: viewer.seat.id,
                displayName: viewer.seat.displayName,
                anonymityEligible: viewer.seat.anonymityEligible,
              }
            : null
        }
        citations={citations}
        coAuthorOptions={coAuthorOptions}
        directives={listed.ok ? listed.data.directives : []}
        nameByAllocationId={listed.ok ? listed.data.nameByAllocationId : snapshot.nameByAllocationId}
        activeCrisis={gate.activeCrisis}
        blockedByStatus={gate.blockedByStatus}
        anonymityUsedThisSession={gate.anonymityUsedThisSession}
      />
    </MunPageShell>
  );
}
