// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { createAdminClient } from "@/lib/supabase/admin";

const CHUNK = 20;

/**
 * Resolve Auth emails for known user ids via getUserById (O(roster)), not listUsers (O(all users)).
 */
export async function getAuthEmailsByUserIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const emailByUserId = new Map<string, string>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return emailByUserId;

  const admin = createAdminClient();
  if (!admin) return emailByUserId;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user?.email) return null;
        return [id, data.user.email] as const;
      })
    );
    for (const hit of results) {
      if (hit) emailByUserId.set(hit[0], hit[1]);
    }
  }

  return emailByUserId;
}
