import nodemailer from "nodemailer";
import { buildSeamunIntermunInviteEmail } from "./invite-email-template.mjs";

export const INVITE_ARCHIVE_BCC = "information@seamun.com";

/** Default From display name for SEAMUN I 2027 archive invites. Override with INVITE_FROM_NAME. */
export const SEAMUN_INVITE_FROM_DISPLAY_NAME = "Information @ SEAMUN I 2027";

function getInviteArchiveBcc() {
  return process.env.INVITE_ARCHIVE_BCC?.trim() || INVITE_ARCHIVE_BCC;
}

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "InterMUN";
}

function getInviteFromDisplayName() {
  return process.env.INVITE_FROM_NAME?.trim() || SEAMUN_INVITE_FROM_DISPLAY_NAME;
}

function extractEmailAddress(value) {
  const angle = String(value).match(/<([^>]+@[^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  if (/^[^\s<>]+@[^\s<>]+$/.test(String(value).trim())) return String(value).trim();
  return null;
}

/**
 * From for archive invites: SEAMUN I 2027 display name + SMTP mailbox
 * (owned by SMTP_USER), not MATERIALS_EXPORT_FROM (Hostinger 553 when From is
 * no-reply@ but auth is information@).
 * Full override: INVITE_FROM. Display-name-only: INVITE_FROM_NAME.
 */
function getInviteFromAddress() {
  const explicit = process.env.INVITE_FROM?.trim();
  if (explicit) return explicit;
  const displayName = getInviteFromDisplayName();
  const user = process.env.SMTP_USER?.trim();
  const mailbox =
    (user ? extractEmailAddress(user) : null) || getInviteArchiveBcc();
  return `${displayName} <${mailbox}>`;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  // Auth/config only — invite From is resolved separately (see getInviteFromAddress).
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? "587"),
    user,
    pass,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAuthError(error) {
  if (!error || typeof error !== "object") return false;
  const status = typeof error.status === "number" ? error.status : NaN;
  if (status === 502 || status === 503 || status === 504 || status === 429) return true;
  const name = String(error.name ?? "");
  if (/AuthRetryableFetchError/i.test(name)) return true;
  const message = String(error.message ?? "").trim();
  if (!message || message === "{}") return true;
  return /gateway timeout|upstream request timeout|deadline exceeded|timed?\s*out|fetch failed|502|503|504|429/i.test(
    message
  );
}

async function generateInviteLink(admin, email, redirectTo, data) {
  const attempts = 4;
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo, data },
    });
    if (!error && linkData) return linkData;
    lastError = error || { message: "Invite link was not created." };
    if (i >= attempts - 1 || !isRetryableAuthError(lastError)) break;
    await sleep(1200 * (i + 1));
  }
  throw lastError;
}

/** Prefer the requested redirect_to on the action link (Supabase Site URL can otherwise win). */
function withRedirectTo(actionLink, redirectTo) {
  if (!actionLink || !redirectTo) return actionLink;
  try {
    const u = new URL(actionLink);
    u.searchParams.set("redirect_to", redirectTo);
    return u.toString();
  } catch {
    return actionLink;
  }
}

/**
 * Prefer app-hosted /auth/confirm?token_hash=… so clicks never depend on
 * Supabase /auth/v1/verify (which returns raw {"message":"Gateway Timeout"} JSON).
 */
function resolveInviteEmailActionLink(redirectTo, actionLink, hashedToken, verificationType) {
  try {
    const origin = new URL(redirectTo).origin;
    const hashed = String(hashedToken ?? "").trim();
    if (origin && hashed) {
      const u = new URL(`${origin}/auth/confirm`);
      u.searchParams.set("token_hash", hashed);
      u.searchParams.set("type", String(verificationType || "invite").trim() || "invite");
      return u.toString();
    }
  } catch {
    // fall through
  }
  return withRedirectTo(actionLink, redirectTo);
}

async function sendInviteMail({ to, actionLink, bcc, recipient }) {
  const cfg = getSmtpConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  const from = getInviteFromAddress();
  const mail = buildSeamunIntermunInviteEmail({
    actionLink,
    appName: appName(),
    recipient: recipient ?? { name: "", email: to, allocation: "" },
  });
  try {
    const info = await transporter.sendMail({
      from,
      to,
      bcc,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return {
      ok: true,
      from,
      subject: mail.subject,
      messageId: info.messageId ?? null,
      response: info.response ?? null,
      accepted: info.accepted ?? null,
      rejected: info.rejected ?? null,
      recipient: recipient ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "send_failed",
      from,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function inviteUserByEmailWithArchive(
  admin,
  { email, redirectTo, data, recipient }
) {
  const to = String(email ?? "").trim();
  const archive = getInviteArchiveBcc();
  const bcc = archive && to.toLowerCase() !== archive.toLowerCase() ? archive : undefined;
  const recipientPayload = recipient
    ? {
        name: String(recipient.name ?? "").trim(),
        email: String(recipient.email ?? to).trim() || to,
        allocation: String(recipient.allocation ?? "").trim(),
      }
    : { name: "", email: to, allocation: "" };

  if (getSmtpConfig()) {
    let linkData;
    try {
      linkData = await generateInviteLink(admin, to, redirectTo, data);
    } catch (error) {
      return {
        user: null,
        error: {
          message: isRetryableAuthError(error)
            ? "Supabase Auth timed out creating the invite link. Try again in a moment."
            : error?.message || "Invite link was not created.",
        },
      };
    }
    const rawLink = linkData?.properties?.action_link;
    const hashedToken = linkData?.properties?.hashed_token;
    const verificationType = linkData?.properties?.verification_type;
    const user = linkData?.user ?? null;
    if (!rawLink && !hashedToken) {
      return { user, error: { message: "Invite link was not created." } };
    }
    const actionLink = resolveInviteEmailActionLink(
      redirectTo,
      rawLink || "",
      hashedToken,
      verificationType
    );
    const sent = await sendInviteMail({
      to,
      actionLink,
      bcc,
      recipient: recipientPayload,
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
        mailMeta: sent,
      };
    }
    return { user, error: null, mailMeta: sent, actionLink, bcc };
  }

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(to, {
    redirectTo,
    data,
  });
  if (error) return { user: null, error };
  return { user: invited?.user ?? null, error: null };
}
