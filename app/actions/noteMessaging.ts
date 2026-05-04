"use server";

import { createClient } from "@/lib/supabase/server";
import { getChamberScope } from "@/lib/chamber-scope";

export type SendNotePayload = {
  conferenceId: string;
  threadId?: string | null;
  topic?: string | null;
  body: string;
  concernFlag?: boolean;
  senderAllocationId?: string | null;
  idempotencyKey?: string | null;
  recipientAllocationIds?: string[];
  recipientChairProfileIds?: string[];
  anyChair?: boolean;
  toSmtAll?: boolean;
};

export async function sendNoteMessageAction(payload: SendNotePayload): Promise<{ messageId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const scope = await getChamberScope(supabase, payload.conferenceId);

  const { data, error } = await supabase.rpc("send_note_message", {
    p_conference_id: scope.canonicalConferenceId,
    p_thread_id: payload.threadId ?? null,
    p_topic: payload.topic ?? null,
    p_body: payload.body,
    p_concern_flag: payload.concernFlag ?? false,
    p_sender_allocation_id: payload.senderAllocationId ?? null,
    p_idempotency_key: payload.idempotencyKey ?? null,
    p_recipient_alloc_ids: payload.recipientAllocationIds ?? [],
    p_recipient_chair_profile_ids: payload.recipientChairProfileIds ?? [],
    p_any_chair: payload.anyChair ?? false,
    p_to_smt_all: payload.toSmtAll ?? false,
  });
  if (error) return { error: error.message };
  if (!data || typeof data !== "string") return { error: "Could not create message." };
  return { messageId: data };
}

export async function ackNoteDeliveryAction(args: {
  messageId: string;
  status?: "delivered" | "read";
}): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("ack_note_delivery", {
    p_message_id: args.messageId,
    p_status: args.status ?? "read",
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function listNoteOutboxAction(args: {
  conferenceId: string;
  onlyUnpublished?: boolean;
  limit?: number;
}): Promise<{ rows?: unknown[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const scope = await getChamberScope(supabase, args.conferenceId);
  let q = supabase
    .from("note_outbox")
    .select("*")
    .in("conference_id", scope.siblingConferenceIds)
    .order("created_at", { ascending: false })
    .limit(args.limit ?? 200);
  if (args.onlyUnpublished) q = q.eq("published", false);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { rows: data ?? [] };
}

export async function listNoteUpdatesSinceAction(args: {
  conferenceId: string;
  sinceEventVersion?: number;
  limit?: number;
}): Promise<{ rows?: unknown[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const scope = await getChamberScope(supabase, args.conferenceId);
  let q = supabase
    .from("note_messages")
    .select("id, thread_id, conference_id, sender_profile_id, topic, body, concern_flag, moderation_state, created_at, updated_at, event_version")
    .in("conference_id", scope.siblingConferenceIds)
    .order("event_version", { ascending: true })
    .limit(args.limit ?? 300);
  if (args.sinceEventVersion && Number.isFinite(args.sinceEventVersion)) {
    q = q.gt("event_version", Math.max(0, Math.floor(args.sinceEventVersion)));
  }
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { rows: data ?? [] };
}
