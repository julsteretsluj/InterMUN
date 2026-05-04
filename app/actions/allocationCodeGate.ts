"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import {
  getCommitteeAwardScope,
  resolveCanonicalCommitteeConferenceId,
} from "@/lib/conference-committee-canonical";
import { getActiveEventId, setActiveEventId } from "@/lib/active-event-cookie";
import { setAllocationCodeVerifiedConferenceId } from "@/lib/allocation-code-gate-cookie";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { canChairSwitchAnyCommitteeForTesting } from "@/lib/testing-overrides";

export async function verifyAllocationCodeGate(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const code = String(formData.get("code") ?? "");
  const nextPathRaw = String(formData.get("next") ?? "/delegate").trim() || "/delegate";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : "/delegate";

  if (!conferenceId) {
    return { error: "Missing committee context." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.toString().toLowerCase();
  const smtSurface = role === "smt" ? await getSmtDashboardSurface() : null;
  if (role !== "delegate" && role !== "chair" && !(role === "smt" && smtSurface === "delegate")) {
    return { error: "Only delegates and chairs use this step." };
  }

  const ctx = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!ctx) {
    return {
      error:
        "Your committee context does not match. Re-enter your conference and committee codes if needed.",
    };
  }
  const [ctxCanon, formCanon] = await Promise.all([
    resolveCanonicalCommitteeConferenceId(supabase, ctx.id),
    resolveCanonicalCommitteeConferenceId(supabase, conferenceId),
  ]);
  if (ctxCanon !== formCanon) {
    return {
      error:
        "Your committee context does not match. Re-enter your conference and committee codes if needed.",
    };
  }

  const eventId = await getActiveEventId();
  if (role === "chair") {
    if (eventId && ctx.event_id !== eventId) {
      return {
        error: "Your conference selection does not match this committee. Re-enter your codes if needed.",
      };
    }
    if (!eventId && ctx.event_id) {
      await setActiveEventId(ctx.event_id);
    }
  } else {
    if (!eventId || ctx.event_id !== eventId) {
      return {
        error: "Your conference selection does not match this committee. Start from the event gate again.",
      };
    }
  }

  const { error } = await supabase.rpc("claim_allocation_code_gate", {
    p_conference_id: formCanon,
    p_code: code,
  });

  if (error) {
    return { error: error.message || "Verification failed." };
  }

  await setActiveConferenceContext(supabase, formCanon);
  await setAllocationCodeVerifiedConferenceId(formCanon);
  redirect(nextPath);
}

export type AllocationGateToggleState = { error?: string; success?: boolean };

export async function setAllocationCodeGateEnabledAction(
  _prev: AllocationGateToggleState | null,
  formData: FormData
): Promise<AllocationGateToggleState> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const enabled = formData.get("gate_enabled") === "on";

  if (!conferenceId) {
    return { error: "Missing committee." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const r = profile?.role?.toString().toLowerCase();
  if (r !== "chair" && r !== "smt" && r !== "admin") {
    return { error: "Only chairs, SMT, and admins can change this." };
  }

  const scope = await getCommitteeAwardScope(supabase, conferenceId);

  if (r === "chair" && !canChairSwitchAnyCommitteeForTesting(user.email)) {
    const { data: seat } = await supabase
      .from("allocations")
      .select("id")
      .in("conference_id", scope.siblingConferenceIds)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!seat) {
      return { error: "You do not have a seat on this committee." };
    }
  }

  const { error } = await supabase.rpc("set_allocation_code_gate_enabled", {
    p_conference_id: scope.canonicalConferenceId,
    p_enabled: enabled,
  });

  if (error) return { error: error.message };

  const siblingOthers = scope.siblingConferenceIds.filter((id) => id !== scope.canonicalConferenceId);
  if (siblingOthers.length > 0) {
    await supabase
      .from("conferences")
      .update({ allocation_code_gate_enabled: enabled })
      .in("id", siblingOthers);
  }
  revalidatePath("/chair/allocation-passwords");
  revalidatePath("/smt/allocation-passwords");
  revalidatePath("/delegate");
  revalidatePath("/chair");
  revalidatePath("/profile");
  return { success: true };
}
