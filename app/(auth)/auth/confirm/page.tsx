// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { AuthConfirmClient } from "@/components/auth/AuthConfirmClient";

type Params = {
  token_hash?: string;
  type?: string;
  next?: string;
};

function normalizeNextPath(value: string | undefined): string {
  const next = String(value ?? "").trim();
  if (!next) return "/auth/set-password";
  if (!next.startsWith("/") || next.startsWith("//")) return "/auth/set-password";
  return next;
}

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  return (
    <AuthConfirmClient
      tokenHash={String(params.token_hash ?? "").trim()}
      type={String(params.type ?? "invite").trim() || "invite"}
      nextPath={normalizeNextPath(params.next)}
    />
  );
}
