// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCommitteeAwardScope } from "@/lib/conference-committee-canonical";

export type ChamberScope = {
  conferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
};

/** Shared helper: normalize any conference id to chamber scope ids. */
export async function getChamberScope(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<ChamberScope> {
  const scope = await getCommitteeAwardScope(supabase, conferenceId);
  const siblingConferenceIds =
    scope.siblingConferenceIds.length > 0 ? scope.siblingConferenceIds : [conferenceId];
  return {
    conferenceId,
    canonicalConferenceId: scope.canonicalConferenceId,
    siblingConferenceIds,
  };
}
