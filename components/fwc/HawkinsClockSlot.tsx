// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { HawkinsClockChip } from "@/components/fwc/HawkinsClockChip";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { isFwcCommittee } from "@/lib/crisis-committee";
import { resolveFwcConferenceScope } from "@/lib/fwc/actor";
import { FWC_SESSION_STATE_SELECT, normalizeSessionStateRow } from "@/lib/fwc/rop-state";
import { createClient } from "@/lib/supabase/server";

/** Loads the Hawkins clock for the viewer's active FWC committee; renders nothing elsewhere. */
export async function loadHawkinsClockProps(conferenceId?: string | null) {
  const supabase = await createClient();
  let confId = conferenceId ?? null;
  if (!confId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const active = await resolveDashboardConferenceForUser(profile?.role, user.id);
    if (!active || !isFwcCommittee(active.committee)) return null;
    confId = active.id;
  }
  const scope = await resolveFwcConferenceScope(supabase, confId);
  if (!scope.ok) return null;
  const canonicalConferenceId = scope.data.canonicalConferenceId;
  const [{ data: row }, { data: procedure }] = await Promise.all([
    supabase.from("fwc_session_state").select(FWC_SESSION_STATE_SELECT).eq("conference_id", canonicalConferenceId).maybeSingle(),
    supabase
      .from("procedure_states")
      .select("committee_session_started_at")
      .eq("conference_id", canonicalConferenceId)
      .maybeSingle(),
  ]);
  return {
    canonicalConferenceId,
    initialRow: row ? normalizeSessionStateRow(row as Record<string, unknown>) : null,
    initialSessionStartedAt: (procedure?.committee_session_started_at as string | null) ?? null,
    serverNowMs: Date.now(),
  };
}

export async function HawkinsClockSlot({ conferenceId }: { conferenceId?: string | null }) {
  const props = await loadHawkinsClockProps(conferenceId);
  if (!props) return null;
  return (
    <div className="pointer-events-none sticky top-2 z-30 flex justify-end px-4 pt-2 sm:px-6">
      <div className="pointer-events-auto">
        <HawkinsClockChip {...props} />
      </div>
    </div>
  );
}
