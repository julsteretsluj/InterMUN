// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";

const PER_DELEGATE_CAP = 15;

export type DelegateFloorActivityMotion = {
  id: string;
  title: string | null;
  description: string | null;
  voteType: string;
  procedureCode: string | null;
  createdAt: string;
};

export type DelegateFloorActivityPoint = {
  id: string;
  kind: "delegate" | "session";
  /** Session point code or `delegate` for chair-logged points. */
  label: string;
  detail: string | null;
  status?: string;
  createdAt: string;
};

export type DelegateFloorActivityResolution = {
  id: string;
  role: "main" | "co" | "signatory";
  url: string | null;
  createdAt: string;
};

export type DelegateFloorActivitySpeech = {
  id: string;
  label: string | null;
  status: string;
  createdAt: string;
};

export type DelegateFloorActivityFlag = {
  id: string;
  kind: "compliment" | "concern" | "reminder";
  reason: string | null;
  createdAt: string | null;
  active: boolean;
};

export type DelegateFloorActivityDiscipline = {
  id: string;
  action: string;
  reason: string | null;
  warningCountAfter: number;
  strikeCountAfter: number;
  createdAt: string;
};

export type DelegateFloorActivity = {
  motions: DelegateFloorActivityMotion[];
  points: DelegateFloorActivityPoint[];
  resolutions: DelegateFloorActivityResolution[];
  speeches: DelegateFloorActivitySpeech[];
  flags: DelegateFloorActivityFlag[];
  discipline: DelegateFloorActivityDiscipline[];
};

export const EMPTY_DELEGATE_FLOOR_ACTIVITY: DelegateFloorActivity = {
  motions: [],
  points: [],
  resolutions: [],
  speeches: [],
  flags: [],
  discipline: [],
};

type DelegateSeatInput = {
  userId: string;
  allocationIds: string[];
};

type PlacardFlags = {
  compliment?: boolean;
  concern?: boolean;
  complimentReason?: string;
  concernReason?: string;
  reminder?: string;
};

function emptyActivityMap(userIds: string[]): Record<string, DelegateFloorActivity> {
  const out: Record<string, DelegateFloorActivity> = {};
  for (const uid of userIds) {
    out[uid] = {
      motions: [],
      points: [],
      resolutions: [],
      speeches: [],
      flags: [],
      discipline: [],
    };
  }
  return out;
}

function pushCapped<T>(
  bucket: T[],
  item: T,
  cap: number = PER_DELEGATE_CAP
): void {
  if (bucket.length < cap) bucket.push(item);
}

function parseFlagsPayload(raw: unknown): Record<string, PlacardFlags> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, PlacardFlags>;
}

export async function loadDelegateFloorActivityByProfileId(
  supabase: SupabaseClient,
  siblingConferenceIds: string[],
  delegates: DelegateSeatInput[]
): Promise<Record<string, DelegateFloorActivity>> {
  if (delegates.length === 0 || siblingConferenceIds.length === 0) {
    return {};
  }

  const allocationToUser = new Map<string, string>();
  const allAllocationIds: string[] = [];
  for (const d of delegates) {
    for (const allocationId of d.allocationIds) {
      allocationToUser.set(allocationId, d.userId);
      allAllocationIds.push(allocationId);
    }
  }

  const uniqueAllocationIds = [...new Set(allAllocationIds)];
  const userIds = [...new Set(delegates.map((d) => d.userId))];
  const result = emptyActivityMap(userIds);

  if (uniqueAllocationIds.length === 0) return result;

  const batchLimit = uniqueAllocationIds.length * PER_DELEGATE_CAP;

  const [
    { data: motionRows },
    { data: delegatePointRows },
    { data: sessionPointRows },
    { data: resolutionRows },
    { data: speechRows },
    { data: flagStateRows },
    { data: disciplineRows },
  ] = await Promise.all([
    supabase
      .from("vote_items")
      .select(
        "id, title, description, vote_type, procedure_code, created_at, motioner_allocation_id"
      )
      .in("conference_id", siblingConferenceIds)
      .in("motioner_allocation_id", uniqueAllocationIds)
      .order("created_at", { ascending: false })
      .limit(batchLimit),
    supabase
      .from("chair_delegate_points")
      .select("id, allocation_id, point_text, created_at")
      .in("allocation_id", uniqueAllocationIds)
      .order("created_at", { ascending: false })
      .limit(batchLimit),
    supabase
      .from("chair_session_points")
      .select("id, raised_by_allocation_id, point_code, detail, status, created_at")
      .in("conference_id", siblingConferenceIds)
      .in("raised_by_allocation_id", uniqueAllocationIds)
      .order("created_at", { ascending: false })
      .limit(batchLimit),
    supabase
      .from("resolutions")
      .select("id, google_docs_url, main_submitters, co_submitters, signatories, created_at")
      .in("conference_id", siblingConferenceIds)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("speaker_queue_entries")
      .select("id, allocation_id, label, status, created_at")
      .in("conference_id", siblingConferenceIds)
      .in("allocation_id", uniqueAllocationIds)
      .order("created_at", { ascending: false })
      .limit(batchLimit),
    supabase
      .from("committee_synced_state")
      .select("conference_id, payload, updated_at")
      .in("conference_id", siblingConferenceIds)
      .eq("state_key", COMMITTEE_SYNCED_STATE_KEYS.DIGITAL_ROOM_FLAGS),
    supabase
      .from("chair_delegate_discipline_events")
      .select(
        "id, allocation_id, action, reason, warning_count_after, strike_count_after, created_at"
      )
      .in("conference_id", siblingConferenceIds)
      .in("allocation_id", uniqueAllocationIds)
      .order("created_at", { ascending: false })
      .limit(batchLimit),
  ]);

  for (const row of motionRows ?? []) {
    const allocationId = row.motioner_allocation_id as string | null;
    if (!allocationId) continue;
    const userId = allocationToUser.get(allocationId);
    if (!userId) continue;
    pushCapped(result[userId].motions, {
      id: row.id as string,
      title: (row.title as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      voteType: String(row.vote_type ?? "motion"),
      procedureCode: (row.procedure_code as string | null) ?? null,
      createdAt: row.created_at as string,
    });
  }

  for (const row of delegatePointRows ?? []) {
    const userId = allocationToUser.get(row.allocation_id as string);
    if (!userId) continue;
    pushCapped(result[userId].points, {
      id: row.id as string,
      kind: "delegate",
      label: "delegate",
      detail: (row.point_text as string | null) ?? null,
      createdAt: row.created_at as string,
    });
  }

  for (const row of sessionPointRows ?? []) {
    const allocationId = row.raised_by_allocation_id as string | null;
    if (!allocationId) continue;
    const userId = allocationToUser.get(allocationId);
    if (!userId) continue;
    pushCapped(result[userId].points, {
      id: row.id as string,
      kind: "session",
      label: String(row.point_code ?? ""),
      detail: (row.detail as string | null) ?? null,
      status: (row.status as string | undefined) ?? undefined,
      createdAt: row.created_at as string,
    });
  }

  for (const row of resolutionRows ?? []) {
    const mainSubmitters = (row.main_submitters ?? []) as string[];
    const coSubmitters = (row.co_submitters ?? []) as string[];
    const signatories = (row.signatories ?? []) as string[];
    const createdAt = row.created_at as string;
    const resolution = {
      id: row.id as string,
      url: (row.google_docs_url as string | null) ?? null,
      createdAt,
    };

    for (const userId of userIds) {
      let role: "main" | "co" | "signatory" | null = null;
      if (mainSubmitters.includes(userId)) role = "main";
      else if (coSubmitters.includes(userId)) role = "co";
      else if (signatories.includes(userId)) role = "signatory";
      if (!role) continue;
      pushCapped(result[userId].resolutions, { ...resolution, role });
    }
  }

  for (const row of speechRows ?? []) {
    const allocationId = row.allocation_id as string | null;
    if (!allocationId) continue;
    const userId = allocationToUser.get(allocationId);
    if (!userId) continue;
    pushCapped(result[userId].speeches, {
      id: row.id as string,
      label: (row.label as string | null) ?? null,
      status: String(row.status ?? "waiting"),
      createdAt: row.created_at as string,
    });
  }

  for (const row of flagStateRows ?? []) {
    const flagsByAlloc = parseFlagsPayload(row.payload);
    const updatedAt = (row.updated_at as string | null) ?? null;
    for (const [allocationId, flags] of Object.entries(flagsByAlloc)) {
      const userId = allocationToUser.get(allocationId);
      if (!userId) continue;
      if (flags?.compliment) {
        pushCapped(result[userId].flags, {
          id: `${allocationId}-compliment`,
          kind: "compliment",
          reason: flags.complimentReason?.trim() || null,
          createdAt: updatedAt,
          active: true,
        });
      }
      if (flags?.concern) {
        pushCapped(result[userId].flags, {
          id: `${allocationId}-concern`,
          kind: "concern",
          reason: flags.concernReason?.trim() || null,
          createdAt: updatedAt,
          active: true,
        });
      }
      if (flags?.reminder?.trim()) {
        pushCapped(result[userId].flags, {
          id: `${allocationId}-reminder`,
          kind: "reminder",
          reason: flags.reminder.trim(),
          createdAt: updatedAt,
          active: true,
        });
      }
    }
  }

  for (const row of disciplineRows ?? []) {
    const userId = allocationToUser.get(row.allocation_id as string);
    if (!userId) continue;
    pushCapped(result[userId].discipline, {
      id: row.id as string,
      action: String(row.action ?? ""),
      reason: (row.reason as string | null) ?? null,
      warningCountAfter: Number(row.warning_count_after ?? 0),
      strikeCountAfter: Number(row.strike_count_after ?? 0),
      createdAt: row.created_at as string,
    });
  }

  for (const userId of userIds) {
    result[userId].points.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    result[userId].points = result[userId].points.slice(0, PER_DELEGATE_CAP);
  }

  return result;
}
