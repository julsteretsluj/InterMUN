"use server";

import { createClient } from "@/lib/supabase/server";

export async function moderateDelegationNoteAction({
  noteId,
  action,
  note,
}: {
  noteId: string;
  action: "approve" | "reject";
  note?: string;
}): Promise<{ ok?: true; error?: string }> {
  const trimmedId = noteId.trim();
  if (!trimmedId) return { error: "Note id is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("moderate_delegation_note", {
    p_note_id: trimmedId,
    p_action: action,
    p_note: note?.trim() || null,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
