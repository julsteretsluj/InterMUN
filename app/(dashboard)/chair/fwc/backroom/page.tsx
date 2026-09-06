// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import { listFwcDirectives } from "@/app/actions/fwcCrisis";
import { FwcBackroomClient } from "@/components/fwc/FwcBackroomClient";
import { MunPageShell } from "@/components/MunPageShell";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import { loadFwcChamberSnapshot } from "@/lib/fwc/load-page-context";
import { isStaffRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ChairFwcBackroomPage() {
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
  if (!isStaffRole(profile?.role)) redirect("/delegate");

  const activeConf = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!activeConf || !isFwcCommittee(activeConf.committee)) {
    redirect("/chair");
  }

  const snapshot = await loadFwcChamberSnapshot(supabase, activeConf.id, {
    movementStatuses: ["queued"],
  });
  const listed = await listFwcDirectives(activeConf.id);

  if (!listed.ok) {
    return (
      <MunPageShell title="FWC Backroom" variant="offset">
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#6E6E73]">
          {listed.error}
        </p>
      </MunPageShell>
    );
  }

  return (
    <MunPageShell title="FWC Backroom" variant="offset">
      <p className="max-w-3xl text-sm leading-relaxed text-[#6E6E73]">
        Score pending directives on the five-point RoP matrix, approve movement, and keep Hawkins
        meters in sync. Rapid crisis actions appear first in the queue.
      </p>

      {snapshot.ensureError ? (
        <p className="rounded-[16px] border border-[#D1D1D6] bg-white px-5 py-4 text-sm text-[#B71C1C]">
          {snapshot.ensureError}
        </p>
      ) : null}

      <FwcBackroomClient
        conferenceId={activeConf.id}
        directives={listed.data.directives}
        movements={snapshot.movements.map((row) => ({
          id: row.id,
          delegateAllocationId: row.delegateAllocationId,
          delegateName: row.delegateName,
          currentGrid: row.currentGrid,
          targetGrid: row.targetGrid,
          baseMp: row.baseMp,
          bonusMp: row.bonusMp,
          terrainType: row.terrainType,
          postMovementAction: row.postMovementAction,
          createdAt: row.createdAt,
        }))}
        meters={snapshot.meters}
        seatsById={snapshot.seatsById}
      />
    </MunPageShell>
  );
}
