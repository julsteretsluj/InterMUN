// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AmendmentType = "add" | "replace" | "delete";
export type AmendmentClassification = "friendly" | "unfriendly";
export type AmendmentStatus = "pending" | "approved" | "rejected";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function submitAmendmentAction(input: {
  conferenceId: string;
  resolutionId: string;
  amendmentType: AmendmentType;
  targetClauseNumber?: number | null;
  originalClause?: string;
  proposedClause?: string;
  delegateEmail?: string;
}): Promise<ActionResult<{ amendmentId: string }>> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!isUuid(input.conferenceId) || !isUuid(input.resolutionId)) {
    return { ok: false, error: "Invalid IDs." };
  }
  if (!["add", "replace", "delete"].includes(input.amendmentType)) {
    return { ok: false, error: "Invalid amendment type." };
  }

  const proposed = (input.proposedClause ?? "").trim();
  const original = (input.originalClause ?? "").trim();
  if (input.amendmentType !== "delete" && !proposed) {
    return { ok: false, error: "A proposed clause is required for Add and Replace amendments." };
  }
  if (input.amendmentType !== "add" && !original && input.targetClauseNumber == null) {
    return { ok: false, error: "Reference the clause you want to replace or delete." };
  }

  // Resolve the submitter's allocation (country/placard) for this committee.
  const { data: alloc } = await supabase
    .from("allocations")
    .select("id, country")
    .eq("conference_id", input.conferenceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (input.delegateEmail ?? user.email ?? "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("amendments")
    .insert({
      conference_id: input.conferenceId,
      resolution_id: input.resolutionId,
      submitted_by: user.id,
      submitter_allocation_id: alloc?.id ?? null,
      delegate_country: alloc?.country ?? null,
      delegate_email: email || null,
      amendment_type: input.amendmentType,
      target_clause_number:
        input.targetClauseNumber != null && Number.isFinite(input.targetClauseNumber)
          ? Math.max(1, Math.floor(input.targetClauseNumber))
          : null,
      original_clause: original || null,
      proposed_clause: proposed || null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? "Could not submit amendment." };
  }
  revalidatePath("/amendments");
  return { ok: true, data: { amendmentId: data.id } };
}

export async function reviewAmendmentAction(input: {
  amendmentId: string;
  status: AmendmentStatus;
  classification?: AmendmentClassification | null;
}): Promise<ActionResult<{ amendmentId: string }>> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!isUuid(input.amendmentId)) return { ok: false, error: "Invalid amendment id." };
  if (!["pending", "approved", "rejected"].includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }

  const { error } = await supabase.rpc("review_amendment", {
    p_amendment_id: input.amendmentId,
    p_status: input.status,
    p_classification: input.classification ?? null,
    p_note: null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/amendments");
  return { ok: true, data: { amendmentId: input.amendmentId } };
}

export async function deleteAmendmentAction(input: {
  amendmentId: string;
}): Promise<ActionResult<{ amendmentId: string }>> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  if (!isUuid(input.amendmentId)) return { ok: false, error: "Invalid amendment id." };

  const { error } = await supabase.from("amendments").delete().eq("id", input.amendmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/amendments");
  return { ok: true, data: { amendmentId: input.amendmentId } };
}
