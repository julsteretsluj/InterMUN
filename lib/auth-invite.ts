// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAppName } from "@/lib/branding";
import { isRetryableAuthError, withAuthRetry } from "@/lib/auth-retry";
import { buildAppInviteAcceptUrl, withRedirectTo } from "@/lib/invite-accept-url";
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

async function generateInviteLink(
  admin: SupabaseClient,
  email: string,
  redirectTo: string,
  data?: Record<string, unknown>
) {
  return withAuthRetry(async () => {
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data,
      },
    });
    if (error) {
      const err = Object.assign(new Error(error.message || "generateLink failed"), {
        name: (error as { name?: string }).name || "AuthError",
        status: (error as { status?: number }).status,
      });
      throw err;
    }
    return linkData;
  });
}

/**
 * Prefer an app-hosted accept URL (token_hash → /auth/confirm) so invite clicks
 * never depend on Supabase's browser /auth/v1/verify redirect (frequent 504 JSON).
 * Falls back to a redirect_to-patched action_link when hashed_token is missing.
 */
export function resolveInviteEmailActionLink(args: {
  redirectTo: string;
  actionLink: string;
  hashedToken?: string | null;
  verificationType?: string | null;
}): string {
  const origin = appOriginFromRedirect(args.redirectTo);
  const hashed = args.hashedToken?.trim();
  if (origin && hashed) {
    return buildAppInviteAcceptUrl({
      appOrigin: origin,
      hashedToken: hashed,
      type: args.verificationType || "invite",
    });
  }
  return withRedirectTo(args.actionLink, args.redirectTo);
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

    const rawLink = linkData?.properties?.action_link;
    const hashedToken = linkData?.properties?.hashed_token;
    const verificationType = linkData?.properties?.verification_type;
    const user = linkData?.user ?? null;
    if (!rawLink && !hashedToken) {
      return { user, error: { message: "Invite link was not created." } };
    }
    const actionLink = resolveInviteEmailActionLink({
      redirectTo: args.redirectTo,
      actionLink: rawLink || "",
      hashedToken,
      verificationType,
    });

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

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: args.redirectTo,
    data: args.data,
  });
  if (error) return { user: null, error };

  return { user: data?.user ?? null, error: null };
}
