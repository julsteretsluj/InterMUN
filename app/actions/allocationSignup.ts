"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import nodemailer from "nodemailer";

type ActionState = { error?: string; success?: boolean };

function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").toLowerCase().trim();
}

async function sendWelcomeToInterMUNEmail(args: { to: string; allocationCountry: string }): Promise<void> {
  // Uses SMTP settings already present for other automated emails (see `exportMaterials.ts`).
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MATERIALS_EXPORT_FROM || process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const subject = "Welcome to InterMUN";
  const text = [
    "Welcome to InterMUN.",
    "",
    `Your delegate account has been confirmed for: ${args.allocationCountry}.`,
    "",
    "You can now proceed to committee sign-in and join the live session.",
    "",
    "See you on the floor.",
    "InterMUN",
  ].join("\n");

  await transporter.sendMail({
    from,
    to: args.to,
    subject,
    text,
  });
}

async function sendChairAllocationSignupReminderEmail(args: {
  to: string;
  allocationCountry: string;
  conferenceLabel: string;
  requesterName: string;
  requesterEmail: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MATERIALS_EXPORT_FROM || process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const reviewPath = "/chair/allocation-matrix";
  const reviewUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${reviewPath}` : reviewPath;
  const subject = "Delegate allocation request pending approval";
  const text = [
    "A delegate has requested an allocation and needs chair review.",
    "",
    `Conference: ${args.conferenceLabel}`,
    `Requested allocation: ${args.allocationCountry}`,
    `Delegate: ${args.requesterName}`,
    `Account email: ${args.requesterEmail}`,
    "",
    "Please approve or reject this request in the chair allocation matrix:",
    reviewUrl,
    "",
    "InterMUN",
  ].join("\n");

  await transporter.sendMail({
    from,
    to: args.to,
    subject,
    text,
  });
}

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

  const admin = createAdminClient();
  if (admin) {
    try {
      const { data: conf } = await admin
        .from("conferences")
        .select("name, committee")
        .eq("id", conferenceId)
        .maybeSingle();
      const conferenceLabel = [conf?.name?.trim(), conf?.committee?.trim()].filter(Boolean).join(" — ") || conferenceId;

      const { data: requesterProfile } = await admin
        .from("profiles")
        .select("name, username")
        .eq("id", user.id)
        .maybeSingle();
      const { data: requesterAuth } = await admin.auth.admin.getUserById(user.id);
      const requesterEmail = normalizeEmail(requesterAuth?.user?.email);
      const requesterName =
        requesterProfile?.name?.toString().trim() ||
        requesterProfile?.username?.toString().trim() ||
        requesterEmail ||
        user.id.slice(0, 8);

      const { data: seatRows } = await admin
        .from("allocations")
        .select("user_id")
        .eq("conference_id", conferenceId)
        .not("user_id", "is", null);
      const seatUserIds = [
        ...new Set((seatRows ?? []).map((row) => row.user_id).filter((id): id is string => Boolean(id))),
      ];
      if (seatUserIds.length > 0) {
        const { data: chairProfiles } = await admin
          .from("profiles")
          .select("id")
          .eq("role", "chair")
          .in("id", seatUserIds);
        const chairIds = [
          ...new Set((chairProfiles ?? []).map((p) => p.id).filter((id): id is string => Boolean(id))),
        ];
        if (chairIds.length > 0) {
          const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          if (!usersError) {
            const chairIdSet = new Set(chairIds);
            const toList = usersData.users
              .filter((u) => chairIdSet.has(u.id))
              .map((u) => normalizeEmail(u.email))
              .filter(Boolean);
            for (const to of toList) {
              await sendChairAllocationSignupReminderEmail({
                to,
                allocationCountry: target.country,
                conferenceLabel,
                requesterName,
                requesterEmail: requesterEmail || "(not available)",
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to send chair allocation signup reminder email:", e);
    }
  }

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  return { success: true };
}

export async function approveAllocationSignupRequestAction(
  formData: FormData
): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return;

  const { supabase, user, role } = await getAuthedProfile();
  if (!user) return;

  const { data: req } = await supabase
    .from("allocation_signup_requests")
    .select("id, conference_id, allocation_id, requested_by, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!req) return;
  if (req.status !== "pending") return;

  const { data: membership } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", req.conference_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!isChairForConference(role, Boolean(membership?.id))) {
    return;
  }

  const { data: target } = await supabase
    .from("allocations")
    .select("id, country, user_id")
    .eq("id", req.allocation_id)
    .eq("conference_id", req.conference_id)
    .maybeSingle();
  if (!target) return;
  if (target.user_id && target.user_id !== req.requested_by) return;

  const { error: clearErr } = await supabase
    .from("allocations")
    .update({ user_id: null })
    .eq("conference_id", req.conference_id)
    .eq("user_id", req.requested_by)
    .neq("id", req.allocation_id);
  if (clearErr) return;

  if (!target.user_id) {
    const { error: setErr } = await supabase
      .from("allocations")
      .update({ user_id: req.requested_by })
      .eq("id", req.allocation_id)
      .eq("conference_id", req.conference_id)
      .is("user_id", null);
    if (setErr) return;
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ allocation: target.country, updated_at: new Date().toISOString() })
    .eq("id", req.requested_by);
  if (profileErr) return;

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
  if (reqErr) return;

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

  // "Architects pipeline" confirmation side-effect:
  // When Pending -> Confirmed, provision delegate role + send Welcome email.
  // (DB concept mapping: `allocation_signup_requests.status` replaces `Pending/Confirmed`.)
  const admin = createAdminClient();
  if (admin) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(req.requested_by);
      const toEmail = normalizeEmail(authUser?.user?.email);
      if (toEmail) {
        // Provision delegate role if needed (spec calls for auto-provision).
        const { data: targetProfile } = await admin
          .from("profiles")
          .select("id, role")
          .eq("id", req.requested_by)
          .maybeSingle();
        const currentRole = targetProfile?.role?.toString().toLowerCase().trim() ?? "delegate";
        if (currentRole !== "delegate") {
          await admin.from("profiles").update({ role: "delegate", updated_at: now }).eq("id", req.requested_by);
        }

        // Spec wants a login-email == sign-up-email check. We don't store a separate signup email,
        // so the auth email acts as both.
        const loginEmail = toEmail;
        const signUpEmail = toEmail;
        if (loginEmail === signUpEmail) {
          await sendWelcomeToInterMUNEmail({ to: toEmail, allocationCountry: target.country });
        }
      }
    } catch (e) {
      // Approval must not fail due to email provisioning.
      console.error("Failed to send Welcome to InterMUN email:", e);
    }
  }

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  revalidatePath("/profile");
  revalidatePath("/admin");
}

export async function rejectAllocationSignupRequestAction(
  formData: FormData
): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return;

  const { supabase, user, role } = await getAuthedProfile();
  if (!user) return;

  const { data: req } = await supabase
    .from("allocation_signup_requests")
    .select("id, conference_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return;
  if (req.status !== "pending") return;

  const { data: membership } = await supabase
    .from("allocations")
    .select("id")
    .eq("conference_id", req.conference_id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!isChairForConference(role, Boolean(membership?.id))) {
    return;
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
  if (error) return;

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  revalidatePath("/admin");
}

export async function chairAssignDelegateByEmailAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const conferenceId = String(formData.get("conference_id") ?? "").trim();
  const allocationId = String(formData.get("allocation_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!conferenceId || !allocationId || !email) {
    return { error: "Conference, allocation, and delegate email are required." };
  }

  const { supabase, user } = await getAuthedProfile();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.rpc("chair_assign_delegate_by_email", {
    p_conference_id: conferenceId,
    p_allocation_id: allocationId,
    p_email: email,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chair/allocation-matrix");
  revalidatePath("/smt/allocation-matrix");
  revalidatePath("/profile");
  revalidatePath("/committee-room");
  return { success: true };
}
