/** SEAMUN I 2027 InterMUN announcement + invite CTA (script-side mirror of lib/invite-email.ts). */

export const SEAMUN_INTERMUN_INVITE_SUBJECT =
  "SEAMUN I 2027 will use InterMUN — accept your invite";

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

/**
 * Announcement body for SEAMUN I 2027 InterMUN rollout.
 * Includes clear recipient identity fields and a CTA when `actionLink` is provided.
 */
export function buildSeamunIntermunInviteEmail({ actionLink, appName, recipient }) {
  const name = String(appName ?? "").trim() || "InterMUN";
  const link = String(actionLink ?? "").trim();
  const safeLink = escapeHtml(link);
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

  const text = [
    "Dear SEAMUN I 2027 Delegates, Chairs, Advisors, and Secretariat Members,",
    "",
    identityText,
    "",
    `We are excited to announce that SEAMUN I 2027 will be using ${name} as our official digital conference platform!`,
    "",
    `${name} will streamline our committee sessions—handling everything from roll call, speaker lists, and timer tracking to motions, caucuses, and resolution writing.`,
    "",
    "What to Expect Next",
    "",
    "In the coming days, you will receive follow-up emails containing your personalized access details:",
    "",
    "* Login Credentials: Unique account details to log into your customized dashboard (tailored for Delegates, Chairs, Advisors, or SMT/Admin).",
    "* Role-Specific Guides: Detailed documentation and step-by-step walkthroughs explaining how to navigate and utilize InterMUN for your specific role during the conference.",
    "",
    "Please keep an eye on your inbox for these emails. Once you receive your credentials, we recommend logging in early to familiarize yourself with the interface before committee sessions begin.",
    "",
    "Your InterMUN invite is ready now — use the link below to accept it, set your password, and open the platform. Role-specific guides and further access details will follow as announced above.",
    "",
    "Accept your InterMUN invite:",
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
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;">Official digital conference platform</div>
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

              <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;letter-spacing:-0.01em;">What to Expect Next</h2>
              <p style="margin:0 0 12px;">In the coming days, you will receive follow-up emails containing your personalized access details:</p>
              <ul style="margin:0 0 16px;padding-left:20px;color:#1D1D1F;">
                <li style="margin-bottom:10px;"><strong>Login Credentials:</strong> Unique account details to log into your customized dashboard (tailored for Delegates, Chairs, Advisors, or SMT/Admin).</li>
                <li style="margin-bottom:10px;"><strong>Role-Specific Guides:</strong> Detailed documentation and step-by-step walkthroughs explaining how to navigate and utilize InterMUN for your specific role during the conference.</li>
              </ul>
              <p style="margin:0 0 20px;">Please keep an eye on your inbox for these emails. Once you receive your credentials, we recommend logging in early to familiarize yourself with the interface before committee sessions begin.</p>

              <p style="margin:0 0 16px;color:#6E6E73;">Your InterMUN invite is ready now — accept it below to set your password and open the platform. Role-specific guides and further access details will follow as announced above.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:980px;background:#007AFF;">
                    <a href="${safeLink}" style="display:inline-block;padding:12px 22px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;">Accept your InterMUN invite</a>
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
