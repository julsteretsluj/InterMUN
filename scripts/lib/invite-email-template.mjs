/** SEAMUN I 2027 InterMUN announcement + set-password CTA (script-side mirror of lib/invite-email.ts). */

export const SEAMUN_INTERMUN_INVITE_SUBJECT =
  "SEAMUN I 2027 InterMUN — set your password and join";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAllocationLine(recipient) {
  const raw = recipient?.allocation?.trim?.() || String(recipient?.allocation ?? "").trim();
  if (raw) return raw;
  return "Pending / not yet assigned";
}

export function formatArchiveSentAt(date) {
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export function archiveRedactedCtaText(sentTo) {
  return `Set-password link sent to ${sentTo} — removed from this archive copy.`;
}

/**
 * Announcement + clear set-password CTA for pre-registered SEAMUN I 2027 accounts.
 */
export function buildSeamunIntermunInviteEmail({ actionLink, appName, recipient }) {
  return renderInviteEmail({
    appName,
    recipient,
    cta: { kind: "link", link: String(actionLink ?? "").trim() },
  });
}

/**
 * Archive copy for information@: same body, but no links at all. The one-time
 * set-password URL is replaced with plain text so the archive inbox can never
 * consume the recipient's token.
 */
export function buildSeamunIntermunInviteArchiveEmail({ sentTo, sentAt, appName, recipient }) {
  const to = String(sentTo ?? "").trim();
  const mail = renderInviteEmail({
    appName,
    recipient,
    cta: { kind: "archive", sentTo: to, sentAt },
  });
  return { ...mail, subject: `[Archive] ${mail.subject} — to ${to}` };
}

/**
 * Returns every reason an archive copy is unsafe to send. Archive copies must
 * carry no URLs, no auth confirm/verify paths, and none of the given secrets
 * (action link, hashed token).
 */
export function findArchiveEmailLeaks(mail, secrets = []) {
  const leaks = [];
  const parts = [
    ["subject", mail.subject],
    ["text", mail.text],
    ["html", mail.html],
  ];
  const patterns = [
    ["token_hash", /token_hash/i],
    ["/auth/confirm", /\/auth\/confirm/i],
    ["/auth/v1/verify", /\/auth\/v1\/verify/i],
    ["supabase.co", /supabase\.co/i],
    ["token query param", /[?&](token|access_token|refresh_token|code|type)=/i],
    ["URL", /\b(?:https?:)?\/\/[^\s"'<>]+/i],
    ["anchor tag", /<a\s/i],
    ["href", /\bhref\s*=/i],
  ];
  for (const [part, value] of parts) {
    for (const [label, re] of patterns) {
      if (re.test(value)) leaks.push(`${part}: ${label}`);
    }
    for (const secret of secrets) {
      const s = String(secret ?? "").trim();
      if (s && value.includes(s)) leaks.push(`${part}: secret`);
    }
  }
  return leaks;
}

function renderInviteEmail({ appName, recipient, cta }) {
  const name = String(appName ?? "").trim() || "InterMUN";
  const subject = SEAMUN_INTERMUN_INVITE_SUBJECT;

  const recipientName = String(recipient?.name ?? "").trim() || "SEAMUN I 2027 participant";
  const recipientEmail = String(recipient?.email ?? "").trim();
  const allocationLine = formatAllocationLine(recipient);

  const identityText = [
    "Your details on file:",
    `* Name: ${recipientName}`,
    `* Email: ${recipientEmail || "(not set)"}`,
    `* Allocation: ${allocationLine}`,
  ].join("\n");

  const archiveNotice =
    cta.kind === "archive"
      ? `Archive copy — the original was sent to ${cta.sentTo} on ${formatArchiveSentAt(cta.sentAt)}. Set-password links have been removed.`
      : null;
  const ctaText = cta.kind === "link" ? cta.link : archiveRedactedCtaText(cta.sentTo);

  const text = [
    ...(archiveNotice ? [archiveNotice, "", "---", ""] : []),
    "Dear SEAMUN I 2027 Delegates, Chairs, Advisors, and Secretariat Members,",
    "",
    identityText,
    "",
    `We are excited to announce that SEAMUN I 2027 will be using ${name} as our official digital conference platform!`,
    "",
    `${name} will streamline our committee sessions—handling everything from roll call, speaker lists, and timer tracking to motions, caucuses, and resolution writing.`,
    "",
    "Your account is already registered with the email above. What you need to do now:",
    "",
    "1. Set your password — use the secure link below (one-time).",
    "2. Join your conference / committee — enter the conference and room codes from your organisers.",
    "",
    "Role-specific guides will follow separately. For now, set your password so you can get into the platform.",
    "",
    "Set your InterMUN password:",
    ctaText,
    "",
    "If you have any questions or experience any issues, please do not hesitate to reach out to the Secretariat team.",
    "",
    "Best regards,",
    "",
    "Jules Kitto-Astrop",
    "Secretary-General, SEAMUN I 2027",
  ].join("\n");

  const archiveBannerHtml = archiveNotice
    ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 0 12px;">
          <tr>
            <td style="padding:10px 14px;background:#FFFFFF;border:1px solid #D1D1D6;border-radius:10px;font-size:13px;line-height:1.45;color:#6E6E73;">${escapeHtml(archiveNotice)}</td>
          </tr>
        </table>`
    : "";

  const ctaHtml =
    cta.kind === "link"
      ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:980px;background:#007AFF;">
                    <a href="${escapeHtml(cta.link)}" style="display:inline-block;padding:12px 22px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;">Set your InterMUN password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.45;color:#6E6E73;word-break:break-all;">
                Or open this link:<br />
                <a href="${escapeHtml(cta.link)}" style="color:#007AFF;">${escapeHtml(cta.link)}</a>
              </p>`
      : `
              <p style="margin:0 0 24px;padding:12px 16px;background:#F2F2F7;border:1px dashed #D1D1D6;border-radius:12px;font-size:14px;line-height:1.45;color:#6E6E73;">${escapeHtml(archiveRedactedCtaText(cta.sentTo))}</p>`;

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
      <td align="center">${archiveBannerHtml}
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

              <p style="margin:0 0 16px;">We are excited to announce that SEAMUN I 2027 will be using <strong>${escapeHtml(name)}</strong> as our official digital conference platform!</p>
              <p style="margin:0 0 24px;">${escapeHtml(name)} will streamline our committee sessions—handling everything from roll call, speaker lists, and timer tracking to motions, caucuses, and resolution writing.</p>

              <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:-0.01em;">What to do now</h2>
              <p style="margin:0 0 12px;">Your account is already registered with the email above. Complete these two steps:</p>
              <ol style="margin:0 0 20px;padding-left:20px;color:#1D1D1F;">
                <li style="margin-bottom:10px;"><strong>Set your password</strong> using the secure one-time link below.</li>
                <li style="margin-bottom:10px;"><strong>Join your conference / committee</strong> by entering the conference and room codes from your organisers.</li>
              </ol>
              <p style="margin:0 0 20px;color:#6E6E73;">Role-specific guides will follow separately. Start by setting your password so you can get into the platform.</p>
${ctaHtml}

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
