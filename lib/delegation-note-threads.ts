import type { NoteTopic } from "@/lib/delegation-notes-bundle";

export type DelegationNoteThreadMeta = {
  id: string;
  display_name: string | null;
  message_count: number;
  root_note_id: string | null;
};

export type ThreadableNote = {
  id: string;
  thread_id: string | null;
  reply_to_note_id: string | null;
  topic: NoteTopic;
  content: string;
  created_at: string;
};

export type DelegationNoteThreadGroup<T extends ThreadableNote> = {
  threadId: string;
  meta: DelegationNoteThreadMeta | null;
  messages: T[];
  latest: T;
  root: T;
};

export function groupNotesByThread<T extends ThreadableNote>(
  notes: T[],
  threadMetaById: Map<string, DelegationNoteThreadMeta>
): DelegationNoteThreadGroup<T>[] {
  const byThread = new Map<string, T[]>();

  for (const n of notes) {
    const tid = n.thread_id ?? n.id;
    const arr = byThread.get(tid) ?? [];
    arr.push(n);
    byThread.set(tid, arr);
  }

  const groups: DelegationNoteThreadGroup<T>[] = [];

  for (const [threadId, messages] of byThread) {
    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const root =
      sorted.find((m) => !m.reply_to_note_id) ??
      sorted.find((m) => m.id === threadMetaById.get(threadId)?.root_note_id) ??
      sorted[0]!;
    groups.push({
      threadId,
      meta: threadMetaById.get(threadId) ?? null,
      messages: sorted,
      latest: sorted[sorted.length - 1]!,
      root,
    });
  }

  return groups.sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );
}

export function threadListTitle<T extends ThreadableNote>(
  group: DelegationNoteThreadGroup<T>,
  topicLabel: (topic: NoteTopic) => string,
  fallback: string
): string {
  const name = group.meta?.display_name?.trim();
  if (name) return name;
  return topicLabel(group.root.topic) || fallback;
}

export function canNameThread(messageCount: number): boolean {
  return messageCount >= 3;
}
