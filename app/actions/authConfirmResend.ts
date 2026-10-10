// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use server";

import { getServerAppOrigin } from "@/lib/app-origin";
import { sendRecoverySetPasswordEmailWithArchive } from "@/lib/auth-invite";
import { isRetryableAuthError } from "@/lib/auth-retry";
import { createAdminClient } from "@/lib/supabase/admin";

export type FreshSetPasswordLinkResult =
  | { ok: true; message: string }
  | { ok: false; message: string; authDown?: boolean };

const RESEND_COOLDOWN_MS = 90_000;
/** Process-local cooldown so a double-click / refresh cannot blast SMTP. */
const lastSentByEmail = new Map<string, number>();

function isValidEmail(raw: string): boolean {
  const e = raw.trim();
  return e.length >= 5 && e.includes("@") && !e.includes(" ");
}

/**
 * Public escape hatch from /auth/confirm when verifyOtp is overloaded or the
 * one-time token_hash was spent. Issues a fresh recovery hashed_token only
 * (never creates Auth users) and emails an app-hosted /auth/confirm CTA.
 */
export async function requestFreshSetPasswordLink(
  emailRaw: string
): Promise<FreshSetPasswordLinkResult> {
  const email = String(emailRaw ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, message: "Enter the email your organisers registered for you." };
  }

  const now = Date.now();
  const last = lastSentByEmail.get(email) ?? 0;
  if (now - last < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000);
    return {
      ok: false,
      message: `A fresh link was just sent. Check your inbox (and spam), or wait about ${waitSec}s before requesting another.`,
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      message: "Server cannot create a fresh link right now. Ask your organisers for help.",
    };
  }

  const origin = getServerAppOrigin();
  if (!origin) {
    return {
      ok: false,
      message: "Site URL is not configured for invite links. Ask your organisers for help.",
    };
  }

  const redirectTo = `${origin}/auth/set-password`;
  try {
    const { error } = await sendRecoverySetPasswordEmailWithArchive(admin, {
      email,
      redirectTo,
      recipient: { email },
    });
    if (error) {
      const authDown =
        isRetryableAuthError(error) || /timed out|busy|overload|504|503|502/i.test(error.message);
      const notFound = /user not found|unable to find|does not exist/i.test(error.message);
      return {
        ok: false,
        authDown: authDown && !notFound,
        message: authDown
          ? "Sign-in is still overloaded, so we could not create a fresh link yet. Wait a few minutes and try again — the same email box will get the new link."
          : notFound
            ? "No InterMUN account matches that email. Check the spelling, or ask your organisers to register you."
            : error.message || "Could not send a fresh link.",
      };
    }
  } catch (error) {
    const authDown = isRetryableAuthError(error);
    return {
      ok: false,
      authDown,
      message: authDown
        ? "Sign-in is still overloaded, so we could not create a fresh link yet. Wait a few minutes and try again."
        : error instanceof Error
          ? error.message
          : "Could not send a fresh link.",
    };
  }

  lastSentByEmail.set(email, now);
  return {
    ok: true,
    message:
      "We emailed a fresh set-password link to that address. Open the newest email (not an older invite), then tap Continue once — if Auth is still busy, wait a minute and try that new link again.",
  };
}
