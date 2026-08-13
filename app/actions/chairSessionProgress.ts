// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { CHAIR_FLOW_ITEMS } from "@/lib/chair-dashboard-checklists";
import { getChamberScope } from "@/lib/chamber-scope";

export async function shareChairSessionProgressAction(args: {
  conferenceId: string;
  itemId: string;
  checkedIds: string[];
}): Promise<{ ok?: true; error?: string }> {
  const t = await getTranslations("chairChecklists.flow");
  const tNote = await getTranslations({ locale: "en", namespace: "chairChecklists.flow" });
  const conferenceId = args.conferenceId.trim();
  const itemId = args.itemId.trim();
  if (!conferenceId || !itemId) return { error: t("shareMissing") };
  if (!CHAIR_FLOW_ITEMS.some((i) => i.id === itemId)) {
    return { error: t("shareUnknownItem") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("shareSignIn") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "chair" && role !== "admin" && role !== "smt") {
    return { error: t("shareOnlyChairs") };
  }

  const scope = await getChamberScope(supabase, conferenceId);
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, name")
    .eq("id", scope.canonicalConferenceId)
    .maybeSingle();
  const committee =
    String(conf?.committee ?? "").trim() || String(conf?.name ?? "").trim() || tNote("shareCommitteeFallback");

  const allIds = CHAIR_FLOW_ITEMS.map((i) => i.id);
  const checked = new Set(args.checkedIds.filter((id) => allIds.includes(id)));
  checked.add(itemId);
  const remaining = allIds.filter((id) => !checked.has(id)).map((id) => tNote(`items.${id}`));
  const itemLabel = tNote(`items.${itemId}`);
  const chairName = profile?.name?.trim() || tNote("shareChairFallback");

  const remainingLine =
    remaining.length > 0
      ? tNote("shareRemaining", { remaining: remaining.join(", ") })
      : tNote("shareAllComplete");

  const content = [
    tNote("shareHeadline", { committee, item: itemLabel }),
    tNote("shareCount", { done: checked.size, total: allIds.length }),
    remainingLine,
    tNote("shareByline", { name: chairName }),
  ].join("\n");

  const { data: inserted, error: insertErr } = await supabase
    .from("delegation_notes")
    .insert({
      conference_id: scope.canonicalConferenceId,
      topic: "session progress",
      content,
      concern_flag: false,
      sender_profile_id: user.id,
      sender_allocation_id: null,
    })
    .select("id")
    .single();

  if (insertErr || !inserted?.id) {
    return { error: insertErr?.message ?? t("shareFailed") };
  }

  const nowIso = new Date().toISOString();
  const { error: fwdErr } = await supabase
    .from("delegation_notes")
    .update({ forwarded_to_smt: true, forwarded_at: nowIso })
    .eq("id", inserted.id);
  if (fwdErr) return { error: fwdErr.message };

  revalidatePath("/smt/notes");
  revalidatePath("/chats-notes");
  return { ok: true };
}
