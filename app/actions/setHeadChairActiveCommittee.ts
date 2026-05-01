"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canSwitchCommitteeViaProfile, isHeadChairAllocationLabel } from "@/lib/head-chair-committee-switch";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";

export async function setHeadChairActiveCommittee(
  conferenceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = conferenceId?.trim();
  if (!trimmed) return { ok: false, error: "missing_conference" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "unauthorized" };
  if (!canSwitchCommitteeViaProfile(user.email)) return { ok: false, error: "forbidden" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile?.role ?? "").toString().trim().toLowerCase() !== "chair") {
    return { ok: false, error: "forbidden" };
  }

  const { data: alloc } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("user_id", user.id)
    .eq("conference_id", trimmed)
    .maybeSingle();

  if (!alloc?.id) return { ok: false, error: "no_seat" };
  if (!isHeadChairAllocationLabel(alloc.country)) return { ok: false, error: "not_head_chair" };

  await setActiveConferenceContext(supabase, trimmed);
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}
