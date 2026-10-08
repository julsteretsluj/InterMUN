// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Build an invite accept URL hosted on our app (not Supabase /auth/v1/verify).
 * Browser clicks land on InterMUN HTML; we verify the token_hash with retries
 * so users never see raw Kong `{"message":"Gateway Timeout"}` JSON.
 */
export function buildAppInviteAcceptUrl(args: {
  appOrigin: string;
  hashedToken: string;
  type?: string;
}): string {
  const origin = args.appOrigin.replace(/\/$/, "");
  const u = new URL(`${origin}/auth/confirm`);
  u.searchParams.set("token_hash", args.hashedToken);
  u.searchParams.set("type", args.type?.trim() || "invite");
  return u.toString();
}

/** Prefer redirect_to on the GoTrue action_link (Site URL often wins otherwise). */
export function withRedirectTo(actionLink: string, redirectTo: string): string {
  try {
    const u = new URL(actionLink);
    u.searchParams.set("redirect_to", redirectTo);
    return u.toString();
  } catch {
    return actionLink;
  }
}
