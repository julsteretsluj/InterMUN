// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canRequestOrJoinSpeakerList,
  disciplineSpeakBlockMessage,
  fetchDisciplineForAllocation,
} from "@/lib/delegate-discipline";

export type SpeakerQueueEntry = {
  id: string;
  sort_order: number;
  label: string | null;
  status: string;
  allocation_id: string | null;
};

export async function fetchSpeakerQueue(
  supabase: SupabaseClient,
  conferenceId: string
): Promise<SpeakerQueueEntry[]> {
  const { data, error } = await supabase
    .from("speaker_queue_entries")
    .select("id, sort_order, label, status, allocation_id")
    .eq("conference_id", conferenceId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SpeakerQueueEntry[]) ?? [];
}

export function currentAndNextQueueRows<T extends { id: string; status: string; sort_order: number }>(
  rows: T[]
): { current: T | null; next: T | null } {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const current = sorted.find((r) => r.status === "current") ?? null;
  const curIdx = current ? sorted.findIndex((r) => r.id === current.id) : -1;
  const next = current
    ? (sorted.find((r, i) => r.status === "waiting" && i > curIdx) ??
        sorted.find((r) => r.status === "waiting") ??
        null)
    : (sorted.find((r) => r.status === "waiting") ?? null);
  return { current, next };
}

export function activeAllocationIdsInQueue(rows: SpeakerQueueEntry[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows) {
    if ((r.status === "waiting" || r.status === "current") && r.allocation_id) {
      s.add(r.allocation_id);
    }
  }
  return s;
}

/** Chair or delegate add: skip if allocation already has a waiting/current row. */
export async function addAllocationToSpeakerQueue(
  supabase: SupabaseClient,
  conferenceId: string,
  allocationId: string,
  label: string,
  existingRows: SpeakerQueueEntry[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const active = activeAllocationIdsInQueue(existingRows);
  if (active.has(allocationId)) {
    return {
      ok: false,
      message: "That delegation is already on the list (waiting or current).",
    };
  }
  try {
    const discipline = await fetchDisciplineForAllocation(supabase, conferenceId, allocationId);
    if (!canRequestOrJoinSpeakerList(discipline)) {
      return {
        ok: false,
        message: disciplineSpeakBlockMessage(discipline) ?? "Speaking rights are suspended.",
      };
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not check disciplinary status.",
    };
  }
  const max = existingRows.reduce((m, r) => Math.max(m, r.sort_order), 0);
  const { error } = await supabase.from("speaker_queue_entries").insert({
    conference_id: conferenceId,
    allocation_id: allocationId,
    label,
    sort_order: max + 1,
    status: "waiting",
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
