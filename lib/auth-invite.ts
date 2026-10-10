// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAppName } from "@/lib/branding";
import { isRetryableAuthError, withAuthRetry } from "@/lib/auth-retry";
import { buildAppInviteAcceptUrl } from "@/lib/invite-accept-url";
import {
  buildSeamunIntermunInviteArchiveEmail,
  buildSeamunIntermunInviteEmail,
  findArchiveEmailLeaks,
  type InviteEmailRecipient,
} from "@/lib/invite-email";
import { getSmtpConfig, sendTransactionalEmail } from "@/lib/smtp";

// getAppName is used for invite email body branding (not From display name).

/**
 * Receives a separate, link-free archive copy of every invite so SEAMUN has a
 * record. Never a BCC: the recipient's message carries a live one-time token.
 * Override with INVITE_ARCHIVE_BCC.
 */
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

function archiveAddressFor(toEmail: string): string | undefined {
  const archive = getInviteArchiveBcc();
  if (!archive) return undefined;
  if (toEmail.trim().toLowerCase() === archive.toLowerCase()) return undefined;
  return archive;
}

/**
 * Sends the recipient's invite, then (only if that succeeded) a separate
 * redacted archive copy. Archive failures are logged and never affect the
 * returned recipient result.
 */
async function sendInviteWithArchiveCopy(args: {
  to: string;
  actionLink: string;
  hashedToken: string | null | undefined;
  appName: string;
  recipient: InviteEmailRecipient;
}): Promise<Awaited<ReturnType<typeof sendTransactionalEmail>>> {
  const from = getInviteFromAddress();
  const mail = buildSeamunIntermunInviteEmail({
    actionLink: args.actionLink,
    appName: args.appName,
    recipient: args.recipient,
  });
  const sent = await sendTransactionalEmail({
    to: args.to,
    from,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  if (!sent.ok) return sent;

  const archiveTo = archiveAddressFor(args.to);
  if (!archiveTo) return sent;

  try {
    const archive = buildSeamunIntermunInviteArchiveEmail({
      sentTo: args.to,
      sentAt: new Date(),
      appName: args.appName,
      recipient: args.recipient,
    });
    const leaks = findArchiveEmailLeaks(archive, [args.actionLink, args.hashedToken]);
    if (leaks.length) {
      console.error("[invite-archive] refusing to send archive copy with link/token content", {
        to: args.to,
        leaks,
      });
      return sent;
    }
    const archived = await sendTransactionalEmail({
      to: archiveTo,
      from,
      subject: archive.subject,
      text: archive.text,
      html: archive.html,
    });
    if (!archived.ok) {
      console.error("[invite-archive] archive copy failed", {
        to: args.to,
        reason: archived.reason,
        error: archived.error,
      });
    }
  } catch (error) {
    console.error("[invite-archive] archive copy threw", {
      to: args.to,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return sent;
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

function withLinkRetry<T>(run: () => Promise<T>) {
  return withAuthRetry(run, {
    // generateLink shares the overloaded Auth plane — wait longer between tries.
    attempts: 8,
    baseDelayMs: 2500,
    maxDelayMs: 25_000,
    isRetryable: (error) => isRetryableAuthError(error) && !isAlreadyRegisteredError(error),
  });
}

function requireHashedLinkData<
  T extends { properties?: { hashed_token?: string | null } | null },
>(
  linkData: T | null,
  error: { message?: string; name?: string; status?: number } | null
) {
  if (error) {
    throw Object.assign(new Error(error.message || "generateLink failed"), {
      name: error.name || "AuthError",
      status: error.status,
    });
  }
  if (!linkData?.properties?.hashed_token) {
    throw Object.assign(new Error("Invite link missing hashed_token."), {
      name: "AuthRetryableFetchError",
      status: 504,
    });
  }
  return linkData;
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
  try {
    return await withLinkRetry(async () => {
      const { data: linkData, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo, data },
      });
      return requireHashedLinkData(linkData, error);
    });
  } catch (error) {
    if (!isAlreadyRegisteredError(error)) throw error;
    return await withLinkRetry(async () => {
      const { data: linkData, error: recoveryError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      return requireHashedLinkData(linkData, recoveryError);
    });
  }
}

/** Recovery-only link for already-registered accounts (never creates a new Auth user). */
async function generateRecoveryLink(
  admin: SupabaseClient,
  email: string,
  redirectTo: string
) {
  return withLinkRetry(async () => {
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    return requireHashedLinkData(linkData, error);
  });
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

    const sent = await sendInviteWithArchiveCopy({
      to: email,
      actionLink,
      hashedToken,
      appName,
      recipient,
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

/**
 * Public /auth/confirm escape hatch: recovery link only (no invite / no new Auth user).
 * Same SEAMUN SMTP template + redacted archive copy as invites.
 */
export async function sendRecoverySetPasswordEmailWithArchive(
  admin: SupabaseClient,
  args: {
    email: string;
    redirectTo: string;
    recipient?: {
      name?: string;
      email?: string;
      allocation?: string;
    };
  }
): Promise<{ user: User | null; error: { message: string } | null }> {
  const email = args.email.trim();
  const appName = getAppName();
  const recipient = {
    name: args.recipient?.name?.trim() || "",
    email: args.recipient?.email?.trim() || email,
    allocation: args.recipient?.allocation?.trim() || "",
  };

  if (!getSmtpConfig()) {
    return {
      user: null,
      error: {
        message:
          "Invite email is not configured (SMTP). Refusing stock Supabase recovery mail so the SEAMUN template is preserved.",
      },
    };
  }

  let linkData;
  try {
    linkData = await generateRecoveryLink(admin, email, args.redirectTo);
  } catch (error) {
    const message = isRetryableAuthError(error)
      ? "Supabase Auth timed out creating the recovery link. Try again in a moment."
      : error instanceof Error
        ? error.message
        : "Recovery link was not created.";
    return { user: null, error: { message } };
  }

  const hashedToken = linkData?.properties?.hashed_token;
  const verificationType = linkData?.properties?.verification_type || "recovery";
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
      error: { message: "Refusing to send recovery with Supabase /verify CTA." },
    };
  }

  const sent = await sendInviteWithArchiveCopy({
    to: email,
    actionLink,
    hashedToken,
    appName,
    recipient,
  });

  if (!sent.ok) {
    return {
      user,
      error: {
        message:
          sent.reason === "send_failed"
            ? "Account was found but the recovery email could not be sent."
            : "Invite email is not configured (SMTP).",
      },
    };
  }

  return { user, error: null };
}
