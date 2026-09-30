// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getCachedDashboardAuth } from "@/lib/dashboard-auth";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundleCached } from "@/lib/active-debate-topic";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";

export type ChairSessionConference = {
  conferenceId: string;
  conferenceTitle: string;
  debateConferenceId: string;
  canonicalConferenceId: string;
  rosterConferenceIds: string[];
  debateTopicOptions: { id: string; label: string }[];
  committeeLabelRaw: string | null;
};

/** Request-scoped: layout + page share one conference resolution. */
const getConferenceForDashboardCached = cache(
  async (
    role: string | null | undefined,
    userId: string,
    smtDashboardSurface: "secretariat" | "chair" | "delegate" | null
  ) =>
    getConferenceForDashboard({
      role,
      userId,
      smtDashboardSurface,
    })
);

/**
 * Chair-only access + active committee. Returns null when no committee is joined (caller shows room-code CTA).
 * Dedupes auth / conference / debate-bundle work already done by the dashboard layout in the same request.
 */
export async function loadChairSessionConference(): Promise<ChairSessionConference | null> {
  const pathname = (await headers()).get("x-pathname") || "/chair/session";
  const { user, profile, supabase } = await getCachedDashboardAuth();
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const role = profile?.role ?? null;
  if (role !== "chair") {
    if (role === "smt") {
      const surface = await getSmtDashboardSurface();
      if (surface !== "chair") {
        redirect("/smt?e=smt-no-session-floor");
      }
    } else if (role === "admin") {
      redirect("/admin?e=no-session-floor");
    } else {
      redirect("/profile");
    }
  }

  const smtSurface = role === "smt" ? await getSmtDashboardSurface() : null;
  const active = await getConferenceForDashboardCached(
    role === "smt" ? "smt" : "chair",
    user.id,
    smtSurface
  );
  if (!active) return null;

  const bundle = await getResolvedDebateConferenceBundleCached(supabase, active.id);
  const conferenceTitle = [active.name, active.committee].filter(Boolean).join(" — ");
  return {
    conferenceId: active.id,
    conferenceTitle,
    debateConferenceId: bundle.debateConferenceId,
    canonicalConferenceId: bundle.canonicalConferenceId,
    rosterConferenceIds: bundle.siblingConferenceIds,
    debateTopicOptions: bundle.debateTopicOptions,
    committeeLabelRaw: bundle.committeeLabelRaw,
  };
}

/** Alias so floor layout + pages share one resolution per request. */
export const loadChairSessionConferenceCached = cache(loadChairSessionConference);
