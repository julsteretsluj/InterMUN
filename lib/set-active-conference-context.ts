// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import { setActiveConferenceId } from "@/lib/active-conference-cookie";
import { setActiveEventId } from "@/lib/active-event-cookie";

/** Sets event + committee cookies from a conference row (always keep them in sync). */
export async function setActiveConferenceContext(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<void> {
  const { data } = await supabase
    .from("conferences")
    .select("event_id")
    .eq("id", conferenceId)
    .maybeSingle();

  if (data?.event_id) {
    await setActiveEventId(data.event_id);
  }
  await setActiveConferenceId(conferenceId);
}
