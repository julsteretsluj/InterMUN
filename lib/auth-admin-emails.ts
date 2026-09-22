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

/**
 * Find an Auth user id by email. Caps pagination (does not create users / send mail).
 */
export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  if (!target.includes("@")) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === target);
    if (hit?.id) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}
