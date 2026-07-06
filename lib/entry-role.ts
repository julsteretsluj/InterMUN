// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** sessionStorage: post-login hint for first route; must match the account’s real role. */
export const INTERMUN_ENTRY_ROLE_KEY = "intermun.entryRole";

export type InterMunEntryRole = "chair" | "delegate" | "secretariat" | "advisor";

export function isInterMunEntryRole(v: string | null): v is InterMunEntryRole {
  return v === "chair" || v === "delegate" || v === "secretariat" || v === "advisor";
}
