// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAppName } from "@/lib/branding";
import { isRetryableAuthError, withAuthRetry } from "@/lib/auth-retry";
import { buildAppInviteAcceptUrl } from "@/lib/invite-accept-url";
import { buildSeamunIntermunInviteEmail } from "@/lib/invite-email";
import { getSmtpConfig, sendTransactionalEmail } from "@/lib/smtp";

// getAppName is used for invite email body branding (not From display name).

/** Blind-copied on every invite so SEAMUN has a record. Override with INVITE_ARCHIVE_BCC. */
export const INVITE_ARCHIVE_BCC = "information@seamun.com";

/** Default From display name for SEAMUN I 2027 archive invites. Override with INVITE_FROM_NAME. */
export const SEAMUN_INVITE_FROM_DISPLAY_NAME = "Information @ SEAMUN I 2027";

export function getInviteArchiveBcc(): string {
  return process.env.INVITE_ARCHIVE_BCC?.trim() || INVITE_ARCHIVE_BCC;
}

function getInviteFromDisplayName(): string {
  return process.env.INVITE_FROM_NAME?.trim() || SEAMUN_INVITE_FROM_DISPLAY_NAME;
}

function extractEmailAddress(value: string): string | null {
  const angle = value.match(/<([^>]+@[^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  if (/^[^\s<>]+@[^\s<>]+$/.test(value)) return value.trim();
  return null;
}

/**
 * From for archive invites. Display name defaults to SEAMUN I 2027 branding;
 * mailbox must be owned by SMTP_USER (Hostinger rejects no-reply@ when auth is
 * information@). Does not use MATERIALS_EXPORT_FROM.
 * Full override: INVITE_FROM. Display-name-only override: INVITE_FROM_NAME.
 */
export function getInviteFromAddress(): string {
  const explicit = process.env.INVITE_FROM?.trim();
  if (explicit) return explicit;

  const displayName = getInviteFromDisplayName();
  const user = process.env.SMTP_USER?.trim();
  const mailbox =
    (user ? extractEmailAddress(user) : null) || getInviteArchiveBcc();
  return `${displayName} <${mailbox}>`;
}

function inviteBccFor(toEmail: string): string | undefined {
  const archive = getInviteArchiveBcc().toLowerCase();
  if (!archive) return undefined;
  if (toEmail.trim().toLowerCase() === archive) return undefined;
  return getInviteArchiveBcc();
}

function appOriginFromRedirect(redirectTo: string): string | null {
  try {
    return new URL(redirectTo).origin;
  } catch {
    return null;
  }
}

function isAlreadyRegisteredError(error: unknown): boolean {
  const message = String(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message ?? ""
      : error instanceof Error
        ? error.message
        : ""
  ).toLowerCase();
  return (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already exists")
  );
}

/**
 * Prefer invite for brand-new pre-provisioned emails.
 * If Auth says the user is already registered (common after a prior invite),
 * fall back to recovery so they can still set/reset their password via the same accept UI.
 */
async function generateInviteLink(
  admin: SupabaseClient,
  email: string,
  redirectTo: string,
  data?: Record<string, unknown>
) {
  const tryType = async (type: "invite" | "recovery") => {
    return withAuthRetry(
      async () => {
        const { data: linkData, error } = await admin.auth.admin.generateLink({
          type,
          email,
          options: {
            redirectTo,
            data: type === "invite" ? data : undefined,
          },
        });
        if (error) {
          const err = Object.assign(new Error(error.message || "generateLink failed"), {
            name: (error as { name?: string }).name || "AuthError",
            status: (error as { status?: number }).status,
          });
          throw err;
        }
        if (!linkData?.properties?.hashed_token) {
          throw Object.assign(new Error("Invite link missing hashed_token."), {
            name: "AuthRetryableFetchError",
            status: 504,
          });
        }
        return linkData;
      },
      {
        attempts: 6,
        baseDelayMs: 2000,
        isRetryable: (error) => isRetryableAuthError(error) && !isAlreadyRegisteredError(error),
      }
    );
  };

  try {
    return await tryType("invite");
  } catch (error) {
    if (!isAlreadyRegisteredError(error)) throw error;
    return await tryType("recovery");
  }
}

/**
 * App-hosted accept URL only (token_hash → /auth/confirm).
 * Never returns a Supabase /auth/v1/verify URL (those show Gateway Timeout JSON).
 */
export function resolveInviteEmailActionLink(args: {
  redirectTo: string;
  hashedToken?: string | null;
  verificationType?: string | null;
}): string {
  const origin = appOriginFromRedirect(args.redirectTo);
  const hashed = args.hashedToken?.trim();
  if (!origin || !hashed) {
    throw new Error("Cannot build app-hosted invite URL (missing origin or hashed_token).");
  }
  return buildAppInviteAcceptUrl({
    appOrigin: origin,
    hashedToken: hashed,
    type: args.verificationType || "invite",
  });
}

export async function inviteUserByEmailWithArchive(
  admin: SupabaseClient,
  args: {
    email: string;
    redirectTo: string;
    data?: Record<string, unknown>;
    /** Optional identity block shown in the SEAMUN announcement invite. */
    recipient?: {
      name?: string;
      email?: string;
      allocation?: string;
    };
  }
): Promise<{ user: User | null; error: { message: string } | null }> {
  const email = args.email.trim();
  const bcc = inviteBccFor(email);
  const appName = getAppName();
  const recipient = {
    name: args.recipient?.name?.trim() || "",
    email: args.recipient?.email?.trim() || email,
    allocation: args.recipient?.allocation?.trim() || "",
  };

  if (getSmtpConfig()) {
    let linkData;
    try {
      linkData = await generateInviteLink(admin, email, args.redirectTo, args.data);
    } catch (error) {
      const message = isRetryableAuthError(error)
        ? "Supabase Auth timed out creating the invite link. Try again in a moment."
        : error instanceof Error
          ? error.message
          : "Invite link was not created.";
      return { user: null, error: { message } };
    }

    const hashedToken = linkData?.properties?.hashed_token;
    const verificationType = linkData?.properties?.verification_type;
    const user = linkData?.user ?? null;
    let actionLink: string;
    try {
      actionLink = resolveInviteEmailActionLink({
        redirectTo: args.redirectTo,
        hashedToken,
        verificationType,
      });
    } catch (e) {
      return {
        user,
        error: { message: e instanceof Error ? e.message : String(e) },
      };
    }
    if (/supabase\.co$/i.test(new URL(actionLink).host) || actionLink.includes("/auth/v1/verify")) {
      return {
        user,
        error: { message: "Refusing to send invite with Supabase /verify CTA." },
      };
    }

    const mail = buildSeamunIntermunInviteEmail({ actionLink, appName, recipient });
    const sent = await sendTransactionalEmail({
      to: email,
      bcc,
      from: getInviteFromAddress(),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!sent.ok) {
      return {
        user,
        error: {
          message:
            sent.reason === "send_failed"
              ? "Account was created but the invite email could not be sent."
              : "Invite email is not configured (SMTP).",
        },
      };
    }

    return { user, error: null };
  }

  // SMTP required for SEAMUN announcement template — never fall back to stock GoTrue mail.
  return {
    user: null,
    error: {
      message:
        "Invite email is not configured (SMTP). Refusing stock Supabase invite mail so the SEAMUN template is preserved.",
    },
  };
}
