// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/smtp";
import { getAppName } from "@/lib/branding";

export type SecretariatRegistrationAdminState = {
  error?: string;
  success?: boolean;
};

type FulfillmentField = "rop" | "schedule" | "award_criteria";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? "").toString().toLowerCase();
  if (role !== "admin" && role !== "smt") return { error: "forbidden" as const };
  return { ok: true as const };
}

export async function markSecretariatIntakeCompleteAction(
  _prev: SecretariatRegistrationAdminState | null,
  formData: FormData
): Promise<SecretariatRegistrationAdminState> {
  const t = await getTranslations("secretariatRegistration.admin");
  const gate = await requireStaff();
  if ("error" in gate) return { error: t("errorForbidden") };

  const requestId = String(formData.get("requestId") ?? "").trim();
  const field = String(formData.get("field") ?? "").trim() as FulfillmentField;
  if (!requestId || !["rop", "schedule", "award_criteria"].includes(field)) {
    return { error: t("errorInvalid") };
  }

  const admin = createAdminClient();
  if (!admin) return { error: t("errorNotConfigured") };

  const { data: row, error: fetchError } = await admin
    .from("secretariat_registration_requests")
    .select("contact_email, contact_name, conference_name, rop_status, schedule_status, award_criteria_status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !row) return { error: t("errorNotFound") };

  const patch: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (field === "rop") patch.rop_status = "complete";
  if (field === "schedule") patch.schedule_status = "complete";
  if (field === "award_criteria") patch.award_criteria_status = "complete";

  const { error: updateError } = await admin
    .from("secretariat_registration_requests")
    .update(patch)
    .eq("id", requestId);

  if (updateError) return { error: t("errorUpdateFailed") };

  const appName = getAppName();
  const itemLabel =
    field === "rop"
      ? t("itemRop")
      : field === "schedule"
        ? t("itemSchedule")
        : t("itemAwardCriteria");

  await sendTransactionalEmail({
    to: row.contact_email,
    subject: t("notifyEmailSubject", { app: appName, item: itemLabel }),
    text: [
      t("notifyEmailGreeting", { name: row.contact_name }),
      "",
      t("notifyEmailBody", {
        item: itemLabel,
        conference: row.conference_name,
        app: appName,
      }),
      "",
      t("notifyEmailOutro"),
    ].join("\n"),
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function archiveSecretariatIntakeAction(
  formData: FormData
): Promise<void> {
  const gate = await requireStaff();
  if ("error" in gate) return;

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { error } = await admin
    .from("secretariat_registration_requests")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) return;

  revalidatePath("/admin");
}
