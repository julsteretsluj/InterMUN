"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: boolean };

async function getAuthedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as string | null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, role: profile?.role?.toString().trim().toLowerCase() ?? null };
}

function isChairForConference(role: string | null, conferenceMembership: boolean) {
  if (role === "smt" || role === "admin") return true;
  return role === "chair" && conferenceMembership;
}

export async function createAllocationSignupRequestAction(
  conferenceId: string,
  allocationId: string
): Promise<ActionState> {
  const { supabase, user, role } = await getAuthedProfile();
  if (!user) return { error: "You must be signed in." };
  if (role !== "delegate" && role !== "chair") {
    return { error: "Only delegate/chair accounts can request allocation sign-up." };
  }

  const { data: target } = await supabase
    .from("allocations")
    .select("id, conference_id, country, user_id")
    .eq("id", allocationId)
    .eq("conference_id", conferenceId)
    .maybeSingle();

  if (!target) return { error: "Allocation not found." };
  if (target.user_id && target.user_id !== user.id) {
    return { error: "That allocation has already been assigned." };
  }
  if (target.user_id === user.id) return { success: true };

  const { data: existingPending } = await supabase
    .from("allocation_signup_requests")
    .select("id")
    .eq("conference_id", conferenceId)
    .eq("requested_by", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending?.id) {
    const { error: updErr } = await supabase
      .from("allocation_signup_requests")
      .update({
        allocation_id: allocationId,
        reviewed_by: null,
        reviewed_at: null,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPending.id);
    if (updErr) return { error: updErr.message };
  } else {
    const { error: insErr } = await supabase.from("allocation_signup_requests").insert({
      conference_id: conferenceId,
      allocation_id: allocationId,
      requested_by: user.id,
      status: "pending",
    });
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  return { success: true };
}

export async function approveAllocationSignupRequestAction(
  formData: FormData
): Promise<ActionState> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return { error: "Missing request id." };

  const { supabase, user, role } = await getAuthedProfile();
  if (!user) return { error: "You must be signed in." };

  const { data: req } = await supabase
    .from("allocation_signup_requests")
    .select("id, conference_id, allocation_id, requested_by, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!req) return { error: "Request not found." };
  if (req.status !== "pending") return { error: "Request is no longer pending." };

  const { data: membership } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", req.conference_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!isChairForConference(role, Boolean(membership?.id))) {
    return { error: "Only committee chairs (or SMT/admin) can approve requests." };
  }

  const { data: target } = await supabase
    .from("allocations")
    .select("id, country, user_id")
    .eq("id", req.allocation_id)
    .eq("conference_id", req.conference_id)
    .maybeSingle();
  if (!target) return { error: "Target allocation not found." };
  if (target.user_id && target.user_id !== req.requested_by) {
    return { error: "Allocation already assigned to another account." };
  }

  const { error: clearErr } = await supabase
    .from("allocations")
    .update({ user_id: null })
    .eq("conference_id", req.conference_id)
    .eq("user_id", req.requested_by)
    .neq("id", req.allocation_id);
  if (clearErr) return { error: clearErr.message };

  if (!target.user_id) {
    const { error: setErr } = await supabase
      .from("allocations")
      .update({ user_id: req.requested_by })
      .eq("id", req.allocation_id)
      .eq("conference_id", req.conference_id)
      .is("user_id", null);
    if (setErr) return { error: setErr.message };
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ allocation: target.country, updated_at: new Date().toISOString() })
    .eq("id", req.requested_by);
  if (profileErr) return { error: profileErr.message };

  const now = new Date().toISOString();
  const { error: reqErr } = await supabase
    .from("allocation_signup_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", req.id);
  if (reqErr) return { error: reqErr.message };

  await supabase
    .from("allocation_signup_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
      note: "Superseded by approved allocation request.",
    })
    .eq("conference_id", req.conference_id)
    .eq("requested_by", req.requested_by)
    .eq("status", "pending")
    .neq("id", req.id);

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  revalidatePath("/profile");
  return { success: true };
}

export async function rejectAllocationSignupRequestAction(
  formData: FormData
): Promise<ActionState> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return { error: "Missing request id." };

  const { supabase, user, role } = await getAuthedProfile();
  if (!user) return { error: "You must be signed in." };

  const { data: req } = await supabase
    .from("allocation_signup_requests")
    .select("id, conference_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { error: "Request not found." };
  if (req.status !== "pending") return { error: "Request is no longer pending." };

  const { data: membership } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", req.conference_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!isChairForConference(role, Boolean(membership?.id))) {
    return { error: "Only committee chairs (or SMT/admin) can reject requests." };
  }

  const { error } = await supabase
    .from("allocation_signup_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.id);
  if (error) return { error: error.message };

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  return { success: true };
}
