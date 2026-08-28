// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getResolvedActiveConference } from "@/lib/active-conference";
import { COMMITTEE_SYNCED_STATE_KEYS } from "@/lib/committee-synced-state-keys";
import { getCommitteeAwardScope } from "@/lib/conference-committee-canonical";
import {
  otherTopicIdForDay2,
  parseActiveDebateTopicPayload,
  resolveAgendaDayTopicIds,
  type ActiveDebateTopicPayload,
} from "@/lib/active-debate-topic";

function revalidateDebateTopicPaths() {
  revalidatePath("/chair/session");
  revalidatePath("/chair/session/motions");
  revalidatePath("/chair/session/discipline");
  revalidatePath("/chair/session/timer");
  revalidatePath("/chair/session/speakers");
  revalidatePath("/chair/session/roll-call");
  revalidatePath("/chair/session/announcements");
  revalidatePath("/delegate");
  revalidatePath("/committee-room");
}

async function requireChairCommittee() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    return { error: "Only chairs can change the live debate topic." } as const;
  }

  const active = await getResolvedActiveConference();
  if (!active) return { error: "No active committee." } as const;

  const scope = await getCommitteeAwardScope(supabase, active.id);
  return { supabase, scope };
}

async function readActiveDebatePayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  canonicalConferenceId: string
): Promise<ActiveDebateTopicPayload> {
  const { data } = await supabase
    .from("committee_synced_state")
    .select("payload")
    .eq("conference_id", canonicalConferenceId)
    .eq("state_key", COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC)
    .maybeSingle();
  return parseActiveDebateTopicPayload(data?.payload);
}

async function upsertActiveDebatePayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  canonicalConferenceId: string,
  patch: ActiveDebateTopicPayload
): Promise<{ error?: string }> {
  const prev = await readActiveDebatePayload(supabase, canonicalConferenceId);
  const next: ActiveDebateTopicPayload = {
    topic_conference_id: patch.topic_conference_id ?? prev.topic_conference_id ?? null,
    day1_topic_conference_id:
      patch.day1_topic_conference_id !== undefined
        ? patch.day1_topic_conference_id
        : prev.day1_topic_conference_id ?? null,
    day2_topic_conference_id:
      patch.day2_topic_conference_id !== undefined
        ? patch.day2_topic_conference_id
        : prev.day2_topic_conference_id ?? null,
  };
  const { error } = await supabase.from("committee_synced_state").upsert(
    {
      conference_id: canonicalConferenceId,
      state_key: COMMITTEE_SYNCED_STATE_KEYS.ACTIVE_DEBATE_TOPIC,
      payload: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conference_id,state_key" }
  );
  if (error) return { error: error.message };
  revalidateDebateTopicPaths();
  return {};
}

async function loadOrderedSiblingTopics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siblingIds: string[]
): Promise<{ id: string; name: string }[]> {
  if (siblingIds.length === 0) return [];
  const { data } = await supabase
    .from("conferences")
    .select("id, name, created_at")
    .in("id", siblingIds)
    .order("created_at", { ascending: true });
  return ((data ?? []) as { id: string; name: string | null }[]).map((row) => ({
    id: row.id,
    name: (row.name ?? "").trim(),
  }));
}

async function inferSetAgendaFirstTopicName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siblingIds: string[]
): Promise<string | null> {
  if (siblingIds.length === 0) return null;
  const { data } = await supabase
    .from("vote_items")
    .select("title, outcome, closed_at, created_at")
    .in("conference_id", siblingIds)
    .eq("procedure_code", "set_agenda")
    .not("closed_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(20);
  const rows = (data ?? []) as {
    title: string | null;
    outcome: string | null;
    closed_at: string | null;
  }[];
  const passed = rows.find((r) => r.outcome === "passed" && (r.title ?? "").trim());
  const anyClosed = rows.find((r) => (r.title ?? "").trim());
  return (passed ?? anyClosed)?.title?.trim() ?? null;
}

export async function setActiveDebateTopicAction(topicConferenceId: string): Promise<{ error?: string }> {
  const id = String(topicConferenceId ?? "").trim();
  if (!id) return { error: "Choose a topic." };

  const auth = await requireChairCommittee();
  if ("error" in auth) return auth;

  if (!auth.scope.siblingConferenceIds.includes(id)) {
    return { error: "That topic is not part of this committee." };
  }

  return upsertActiveDebatePayload(auth.supabase, auth.scope.canonicalConferenceId, {
    topic_conference_id: id,
  });
}

/** After a motion to set the agenda passes: live topic is day 1; the other topic (if any) is day 2. */
export async function applySetAgendaTopicOrderAction(
  firstTopicConferenceId: string
): Promise<{ error?: string; day2TopicId?: string | null }> {
  const firstId = String(firstTopicConferenceId ?? "").trim();
  if (!firstId) return { error: "Choose a topic." };

  const auth = await requireChairCommittee();
  if ("error" in auth) return auth;

  const topics = await loadOrderedSiblingTopics(auth.supabase, auth.scope.siblingConferenceIds);
  const ids = topics.map((t) => t.id);
  if (!ids.includes(firstId)) {
    return { error: "That topic is not part of this committee." };
  }

  const day2 = otherTopicIdForDay2(ids, firstId);
  const result = await upsertActiveDebatePayload(auth.supabase, auth.scope.canonicalConferenceId, {
    topic_conference_id: firstId,
    day1_topic_conference_id: firstId,
    day2_topic_conference_id: day2,
  });
  if (result.error) return result;
  return { day2TopicId: day2 };
}

/** Switch the live floor to the topic stored for this conference day (after agenda is set). */
export async function syncLiveTopicToScheduleDayAction(day: 1 | 2): Promise<{ error?: string }> {
  if (day !== 1 && day !== 2) return {};

  const auth = await requireChairCommittee();
  if ("error" in auth) return auth;

  const topics = await loadOrderedSiblingTopics(auth.supabase, auth.scope.siblingConferenceIds);
  if (topics.length <= 1) return {};

  const stored = await readActiveDebatePayload(auth.supabase, auth.scope.canonicalConferenceId);
  let mapping = resolveAgendaDayTopicIds({ topics, stored });
  if (!mapping.day1) {
    const inferredName = await inferSetAgendaFirstTopicName(auth.supabase, topics.map((t) => t.id));
    mapping = resolveAgendaDayTopicIds({ topics, stored, setAgendaFirstTopicName: inferredName });
    if (mapping.day1) {
      const persist = await upsertActiveDebatePayload(auth.supabase, auth.scope.canonicalConferenceId, {
        day1_topic_conference_id: mapping.day1,
        day2_topic_conference_id: mapping.day2,
      });
      if (persist.error) return persist;
    }
  }

  const nextId = day === 2 ? mapping.day2 : mapping.day1;
  if (!nextId || nextId === stored.topic_conference_id) return {};

  return upsertActiveDebatePayload(auth.supabase, auth.scope.canonicalConferenceId, {
    topic_conference_id: nextId,
    day1_topic_conference_id: mapping.day1,
    day2_topic_conference_id: mapping.day2,
  });
}
