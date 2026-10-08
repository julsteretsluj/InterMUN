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

function isAlreadyRegisteredError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already exists")
  );
}

async function generateLinkOfType(admin, type, email, redirectTo, data) {
  // Auth is intermittently 504ing; keep trying so we never ship a stock GoTrue email.
  const attempts = 6;
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type,
      email,
      options: { redirectTo, data: type === "invite" ? data : undefined },
    });
    if (!error && linkData?.properties?.hashed_token) return linkData;
    lastError = error || { message: "Invite link was not created." };
    if (!linkData?.properties?.hashed_token && !error) {
      lastError = { message: "Invite link missing hashed_token." };
    }
    if (isAlreadyRegisteredError(lastError)) throw lastError;
    if (i >= attempts - 1 || !isRetryableAuthError(lastError)) break;
    await sleep(2000 * (i + 1));
  }
  throw lastError;
}

/**
 * Prefer invite for new pre-provisioned emails; if already registered, recovery
 * still lets them set/reset password through /auth/confirm → /auth/set-password.
 */
async function generateInviteLink(admin, email, redirectTo, data) {
  try {
    return await generateLinkOfType(admin, "invite", email, redirectTo, data);
  } catch (error) {
    if (!isAlreadyRegisteredError(error)) throw error;
    return await generateLinkOfType(admin, "recovery", email, redirectTo, data);
  }
}

/**
 * App-hosted /auth/confirm?token_hash=… only.
 * Never email Supabase /auth/v1/verify — that returns raw Gateway Timeout JSON.
 */
function resolveInviteEmailActionLink(redirectTo, hashedToken, verificationType) {
  const origin = new URL(redirectTo).origin;
  const hashed = String(hashedToken ?? "").trim();
  if (!origin || !hashed) {
    throw new Error("Cannot build app-hosted invite URL (missing origin or hashed_token).");
  }
  if (/supabase\.co$/i.test(new URL(origin).host)) {
    throw new Error("Invite redirectTo must be the app origin, not supabase.co.");
  }
  const u = new URL(`${origin}/auth/confirm`);
  u.searchParams.set("token_hash", hashed);
  u.searchParams.set("type", String(verificationType || "invite").trim() || "invite");
  return u.toString();
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
    const hashedToken = linkData?.properties?.hashed_token;
    const verificationType = linkData?.properties?.verification_type;
    const user = linkData?.user ?? null;
    let actionLink;
    try {
      actionLink = resolveInviteEmailActionLink(redirectTo, hashedToken, verificationType);
    } catch (e) {
      return {
        user,
        error: { message: e instanceof Error ? e.message : String(e) },
      };
    }
    // Hard guard: never mail a GoTrue verify URL (504 JSON in the browser).
    try {
      const host = new URL(actionLink).host;
      if (/supabase\.co$/i.test(host) || actionLink.includes("/auth/v1/verify")) {
        return {
          user,
          error: { message: "Refusing to send invite with Supabase /verify CTA." },
        };
      }
    } catch {
      return { user, error: { message: "Invite accept URL was invalid." } };
    }
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

  // SMTP required for SEAMUN announcement template — never fall back to stock GoTrue mail.
  return {
    user: null,
    error: {
      message:
        "Invite email is not configured (SMTP). Refusing stock Supabase invite mail so the SEAMUN template is preserved.",
    },
  };
}
