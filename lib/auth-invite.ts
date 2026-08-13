// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAppName } from "@/lib/branding";
import { getSmtpConfig, sendTransactionalEmail } from "@/lib/smtp";

/** Blind-copied on every invite so SEAMUN has a record. Override with INVITE_ARCHIVE_BCC. */
export const INVITE_ARCHIVE_BCC = "information@seamun.com";

export function getInviteArchiveBcc(): string {
  return process.env.INVITE_ARCHIVE_BCC?.trim() || INVITE_ARCHIVE_BCC;
}

function inviteBccFor(toEmail: string): string | undefined {
  const archive = getInviteArchiveBcc().toLowerCase();
  if (!archive) return undefined;
  if (toEmail.trim().toLowerCase() === archive) return undefined;
  return getInviteArchiveBcc();
}

export async function inviteUserByEmailWithArchive(
  admin: SupabaseClient,
  args: {
    email: string;
    redirectTo: string;
    data?: Record<string, unknown>;
  }
): Promise<{ user: User | null; error: { message: string } | null }> {
  const email = args.email.trim();
  const bcc = inviteBccFor(email);
  const appName = getAppName();

  if (getSmtpConfig()) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: args.redirectTo,
        data: args.data,
      },
    });
    if (error) return { user: null, error };

    const actionLink = data?.properties?.action_link;
    const user = data?.user ?? null;
    if (!actionLink) {
      return { user, error: { message: "Invite link was not created." } };
    }

    const sent = await sendTransactionalEmail({
      to: email,
      bcc,
      subject: `You're invited to ${appName}`,
      text: [
        `You're invited to ${appName}.`,
        "",
        "Open this link to set your password and sign in:",
        actionLink,
        "",
        "If you weren't expecting this, you can ignore this email.",
      ].join("\n"),
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
