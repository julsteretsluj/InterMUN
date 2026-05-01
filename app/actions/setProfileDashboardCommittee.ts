"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";

/**
 * Sets active event + committee cookies when the user has an allocation in that conference.
 * Used from profile settings for delegates and chairs with one or more committee seats.
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

  if (!alloc?.id) return { ok: false, error: "no_seat" };

  await setActiveConferenceContext(supabase, trimmed);
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}
