"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { isDelegateDashboardCommitteeAllowlistedEmail } from "@/lib/delegate-dashboard-committee-allowlist";

/**
 * Sets active event + committee cookies.
 * Delegates: must have an allocation row on that conference.
 * Chairs: same, or target conference may be any session in the active event (room-gate cookie).
 */
export async function setProfileDashboardCommittee(
  conferenceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = conferenceId?.trim();
  if (!trimmed) return { ok: false, error: "missing_conference" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile?.role ?? "").toString().trim().toLowerCase();
  if (role !== "delegate" && role !== "chair") {
    return { ok: false, error: "forbidden" };
  }

  const { data: alloc } = await supabase
    .from("allocations")
    .select("id")
    .eq("user_id", user.id)
    .eq("conference_id", trimmed)
    .maybeSingle();

  if (alloc?.id) {
    await setActiveConferenceContext(supabase, trimmed);
    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { ok: true };
  }

  if (role === "chair") {
    const [{ data: targetConf }, activeEventId] = await Promise.all([
      supabase.from("conferences").select("event_id").eq("id", trimmed).maybeSingle(),
      getActiveEventId(),
    ]);
    if (
      targetConf?.event_id &&
      activeEventId &&
      targetConf.event_id === activeEventId
    ) {
      await setActiveConferenceContext(supabase, trimmed);
      revalidatePath("/profile");
      revalidatePath("/", "layout");
      return { ok: true };
    }
  }

  if (role === "delegate" && isDelegateDashboardCommitteeAllowlistedEmail(user.email)) {
    const [{ data: targetConf }, activeEventId] = await Promise.all([
      supabase.from("conferences").select("event_id").eq("id", trimmed).maybeSingle(),
      getActiveEventId(),
    ]);
    if (
      targetConf?.event_id &&
      activeEventId &&
      targetConf.event_id === activeEventId
    ) {
      await setActiveConferenceContext(supabase, trimmed);
      revalidatePath("/profile");
      revalidatePath("/", "layout");
      return { ok: true };
    }
  }

  return { ok: false, error: "no_seat" };
}
