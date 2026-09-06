// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { listFwcDirectives } from "@/app/actions/fwcCrisis";
import { FwcDirectiveForm } from "@/components/fwc/FwcDirectiveForm";
import { FwcDirectiveList } from "@/components/fwc/FwcDirectiveList";
import { FwcMetersStrip } from "@/components/fwc/FwcMetersStrip";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import {
  loadFwcChamberSnapshot,
  loadViewerFwcCharacterSeat,
} from "@/lib/fwc/load-page-context";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { effectiveDashboardRole } from "@/lib/smt-dashboard-effective-role";
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

  const snapshot = await loadFwcChamberSnapshot(supabase, activeConf.id);
  const viewer = await loadViewerFwcCharacterSeat(
    supabase,
    user.id,
    snapshot.siblingConferenceIds,
    snapshot.canonicalConferenceId,
    snapshot.characterStatesByAllocationId
  );

  const listed = await listFwcDirectives(activeConf.id);
  const directives = listed.ok ? listed.data.directives : [];

  const coSubmitterOptions = snapshot.seats
    .filter((seat) => seat.id !== viewer.seat?.id)
    .map((seat) => ({ id: seat.id, label: seat.displayName }));

  return (
    <MunPageShell title="FWC directives" variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">
        Submit cabinet and personal actions for Backroom review. Anonymized personal, joint, and
        press rows hide submitter details from other delegates.
      </p>

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
        <div className="space-y-2">
          <p className="text-sm text-[#6E6E73]">
            Seated as{" "}
            <span className="font-semibold text-[#1D1D1F]">{viewer.seat.displayName}</span>
            {" · "}
            Grid {viewer.state.currentGrid}
          </p>
          <FwcDirectiveForm
            conferenceId={activeConf.id}
            anonymityEligible={viewer.seat.anonymityEligible}
            anonymityUsedSession={viewer.state.anonymityUsedSession}
            coSubmitterOptions={coSubmitterOptions}
          />
        </div>
      ) : (
        <p className="rounded-[16px] border border-dashed border-[#D1D1D6] bg-white px-5 py-6 text-sm text-[#6E6E73]">
          You need an FWC character seat to submit directives. Chairs can review the queue in
          Backroom.
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#1D1D1F]">Directive queue</h3>
        <FwcDirectiveList
          directives={directives}
          nameByAllocationId={snapshot.nameByAllocationId}
          viewerAllocationIds={viewer.viewerAllocationIds}
        />
      </section>
    </MunPageShell>
  );
}
