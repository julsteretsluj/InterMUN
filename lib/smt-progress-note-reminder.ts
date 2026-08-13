// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const SMT_PROGRESS_NOTE_HREF = "/chats-notes?progress=1";

export function smtProgressReminderStorageKey(conferenceId: string): string {
  return `intermun-smt-progress-note:${conferenceId}`;
}
