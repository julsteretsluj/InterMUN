"use server";

import { createClient } from "@/lib/supabase/server";

export async function renameDelegationNoteThreadAction(
  threadId: string,
  displayName: string
): Promise<{ ok?: true; error?: string }> {
  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Name cannot be empty." };
  if (trimmed.length > 120) return { error: "Name is too long (max 120 characters)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: thread, error: readErr } = await supabase
    .from("delegation_note_threads")
    .select("id, message_count")
    .eq("id", threadId)
    .maybeSingle();

  if (readErr) return { error: readErr.message };
  if (!thread) return { error: "Chat not found." };
  if ((thread.message_count ?? 0) < 3) {
    return { error: "Name this chat after at least three messages have been exchanged." };
  }

  const { error: updErr } = await supabase
    .from("delegation_note_threads")
    .update({ display_name: trimmed, named_at: new Date().toISOString() })
    .eq("id", threadId);

  if (updErr) return { error: updErr.message };
  return { ok: true };
}
