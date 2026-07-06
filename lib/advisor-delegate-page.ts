// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAdvisorAssignmentForDelegateUser,
  type AdvisorAssignmentRow,
} from "@/lib/advisor-access";
import { isAdvisorRole } from "@/lib/roles";

export async function requireAdvisorDelegateContext(
  supabase: SupabaseClient,
  advisorUserId: string,
  delegateUserId: string
): Promise<AdvisorAssignmentRow> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", advisorUserId)
    .maybeSingle();

  if (!isAdvisorRole(profile?.role)) {
    redirect("/advisor");
  }

  const assignment = await fetchAdvisorAssignmentForDelegateUser(
    supabase,
    advisorUserId,
    delegateUserId
  );
  if (!assignment) {
    redirect("/advisor");
  }

  return assignment;
}
