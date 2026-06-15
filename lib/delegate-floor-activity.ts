import type { SupabaseClient } from "@supabase/supabase-js";

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

export type DelegateFloorActivity = {
  motions: DelegateFloorActivityMotion[];
  points: DelegateFloorActivityPoint[];
  resolutions: DelegateFloorActivityResolution[];
};

export const EMPTY_DELEGATE_FLOOR_ACTIVITY: DelegateFloorActivity = {
  motions: [],
  points: [],
  resolutions: [],
};

type DelegateSeatInput = {
  userId: string;
  allocationIds: string[];
};

function emptyActivityMap(userIds: string[]): Record<string, DelegateFloorActivity> {
  const out: Record<string, DelegateFloorActivity> = {};
  for (const uid of userIds) {
    out[uid] = {
      motions: [],
      points: [],
      resolutions: [],
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

  for (const userId of userIds) {
    result[userId].points.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    result[userId].points = result[userId].points.slice(0, PER_DELEGATE_CAP);
  }

  return result;
}
