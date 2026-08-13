import nodemailer from "nodemailer";

export const INVITE_ARCHIVE_BCC = "information@seamun.com";

function getInviteArchiveBcc() {
  return process.env.INVITE_ARCHIVE_BCC?.trim() || INVITE_ARCHIVE_BCC;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = (process.env.MATERIALS_EXPORT_FROM || process.env.SMTP_FROM || user)?.trim();
  if (!host || !user || !pass || !from) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? "587"),
    user,
    pass,
    from,
  };
}

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "InterMUN";
}

async function sendInviteMail({ to, actionLink, bcc }) {
  const cfg = getSmtpConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  try {
    await transporter.sendMail({
      from: cfg.from,
      to,
      bcc,
      subject: `You're invited to ${appName()}`,
      text: [
        `You're invited to ${appName()}.`,
        "",
        "Open this link to set your password and sign in:",
        actionLink,
        "",
        "If you weren't expecting this, you can ignore this email.",
      ].join("\n"),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "send_failed" };
  }
}

export async function inviteUserByEmailWithArchive(admin, { email, redirectTo, data }) {
  const to = String(email ?? "").trim();
  const archive = getInviteArchiveBcc();
  const bcc = archive && to.toLowerCase() !== archive.toLowerCase() ? archive : undefined;

  if (getSmtpConfig()) {
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: to,
      options: { redirectTo, data },
    });
    if (error) return { user: null, error };
    const actionLink = linkData?.properties?.action_link;
    const user = linkData?.user ?? null;
    if (!actionLink) {
      return { user, error: { message: "Invite link was not created." } };
    }
    const sent = await sendInviteMail({ to, actionLink, bcc });
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

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(to, {
    redirectTo,
    data,
  });
  if (error) return { user: null, error };
  return { user: invited?.user ?? null, error: null };
}
