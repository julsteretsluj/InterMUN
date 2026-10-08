// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** SEAMUN I 2027 InterMUN announcement + set-password CTA (shared invite mail copy). */

export const SEAMUN_INTERMUN_INVITE_SUBJECT =
  "SEAMUN I 2027 InterMUN — set your password and join";

export type InviteEmailRecipient = {
  name: string;
  email: string;
  /** Human-readable role / seat / committee line; use pending text when unset. */
  allocation: string;
};

export type InviteEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAllocationLine(recipient?: InviteEmailRecipient | null): string {
  const raw = recipient?.allocation?.trim();
  if (raw) return raw;
  return "Pending / not yet assigned";
}

/**
 * Announcement + clear set-password CTA for pre-registered SEAMUN I 2027 accounts.
 */
export function buildSeamunIntermunInviteEmail(args: {
  actionLink: string;
  appName?: string;
  recipient?: InviteEmailRecipient | null;
}): InviteEmailContent {
  const appName = args.appName?.trim() || "InterMUN";
  const link = args.actionLink.trim();
  const safeLink = escapeHtml(link);
  const subject = SEAMUN_INTERMUN_INVITE_SUBJECT;

  const recipientName = args.recipient?.name?.trim() || "SEAMUN I 2027 participant";
  const recipientEmail = args.recipient?.email?.trim() || "";
  const allocationLine = formatAllocationLine(args.recipient);

  const identityText = [
    "Your details on file:",
    `* Name: ${recipientName}`,
    `* Email: ${recipientEmail || "(not set)"}`,
    `* Allocation: ${allocationLine}`,
  ].join("\n");

  const text = [
    "Dear SEAMUN I 2027 Delegates, Chairs, Advisors, and Secretariat Members,",
    "",
    identityText,
    "",
    `We are excited to announce that SEAMUN I 2027 will be using ${appName} as our official digital conference platform!`,
    "",
    `${appName} will streamline our committee sessions—handling everything from roll call, speaker lists, and timer tracking to motions, caucuses, and resolution writing.`,
    "",
    "Your account is already registered with the email above. What you need to do now:",
    "",
    "1. Set your password — use the secure link below (one-time).",
    "2. Join your conference / committee — enter the conference and room codes from your organisers.",
    "",
    "Role-specific guides will follow separately. For now, set your password so you can get into the platform.",
    "",
    "Set your InterMUN password:",
    link,
    "",
    "If you have any questions or experience any issues, please do not hesitate to reach out to the Secretariat team.",
    "",
    "Best regards,",
    "",
    "Jules Kitto-Astrop",
    "Secretary-General, SEAMUN I 2027",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1D1D1F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F2F7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;border:1px solid #D1D1D6;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;background:#1D1D1F;color:#FFFFFF;">
              <div style="font-size:13px;letter-spacing:0.02em;color:#AEAEB2;margin-bottom:8px;">SEAMUN I 2027 · InterMUN</div>
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;">Set your password and join</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:16px;line-height:1.55;color:#1D1D1F;">
              <p style="margin:0 0 16px;">Dear SEAMUN I 2027 Delegates, Chairs, Advisors, and Secretariat Members,</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#F2F2F7;border:1px solid #D1D1D6;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:13px;font-weight:600;color:#6E6E73;margin-bottom:10px;letter-spacing:0.01em;">Your details on file</div>
                    <p style="margin:0 0 8px;"><strong>Name:</strong> ${escapeHtml(recipientName)}</p>
                    <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(recipientEmail || "(not set)")}</p>
                    <p style="margin:0;"><strong>Allocation:</strong> ${escapeHtml(allocationLine)}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;">We are excited to announce that SEAMUN I 2027 will be using <strong>${escapeHtml(appName)}</strong> as our official digital conference platform!</p>
              <p style="margin:0 0 24px;">${escapeHtml(appName)} will streamline our committee sessions—handling everything from roll call, speaker lists, and timer tracking to motions, caucuses, and resolution writing.</p>

              <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:-0.01em;">What to do now</h2>
              <p style="margin:0 0 12px;">Your account is already registered with the email above. Complete these two steps:</p>
              <ol style="margin:0 0 20px;padding-left:20px;color:#1D1D1F;">
                <li style="margin-bottom:10px;"><strong>Set your password</strong> using the secure one-time link below.</li>
                <li style="margin-bottom:10px;"><strong>Join your conference / committee</strong> by entering the conference and room codes from your organisers.</li>
              </ol>
              <p style="margin:0 0 20px;color:#6E6E73;">Role-specific guides will follow separately. Start by setting your password so you can get into the platform.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:980px;background:#007AFF;">
                    <a href="${safeLink}" style="display:inline-block;padding:12px 22px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;">Set your InterMUN password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.45;color:#6E6E73;word-break:break-all;">
                Or open this link:<br />
                <a href="${safeLink}" style="color:#007AFF;">${safeLink}</a>
              </p>

              <p style="margin:0 0 24px;">If you have any questions or experience any issues, please do not hesitate to reach out to the Secretariat team.</p>

              <p style="margin:0;color:#1D1D1F;">
                Best regards,<br /><br />
                <strong>Jules Kitto-Astrop</strong><br />
                <span style="color:#6E6E73;">Secretary-General, SEAMUN I 2027</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
