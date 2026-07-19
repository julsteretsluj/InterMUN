// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSpeechOutlinePoints } from "@/lib/speech-outline";

export type SaveSpeechOutlineResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "too_many_points" | "point_too_long" | "save_failed" };

/**
 * Persists the caller's speech outline checklist. The row is always the
 * authenticated user's own profile; client-supplied IDs are never trusted.
 */
export async function saveSpeechOutlinePoints(rawPoints: unknown): Promise<SaveSpeechOutlineResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false, error: "unauthorized" };

  const validation = validateSpeechOutlinePoints(rawPoints);
  if (!validation.ok) return { ok: false, error: validation.error };

  const { error } = await supabase
    .from("profiles")
    .update({
      speech_outline_points: validation.points,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "save_failed" };

  revalidatePath("/speeches");
  return { ok: true };
}
