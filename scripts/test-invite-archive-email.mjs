/**
 * Offline check that invite archive copies never carry a working set-password link.
 * Stubs nodemailer and Supabase admin — sends no email and calls no live project.
 *
 *   node --test scripts/test-invite-archive-email.mjs
 */
import assert from "node:assert/strict";
import { register } from "node:module";
import { after, beforeEach, describe, test } from "node:test";
import nodemailer from "nodemailer";

const ROOT = new URL("../", import.meta.url).href;
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@/")) {
        return next(new URL(specifier.slice(2) + ".ts", ${JSON.stringify(ROOT)}).href, context);
      }
      return next(specifier, context);
    }
  `)}`
);

const SAVED_ENV = { ...process.env };
Object.assign(process.env, {
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "1",
  SMTP_USER: "information@seamun.com",
  SMTP_PASS: "not-a-real-password",
  NEXT_PUBLIC_APP_NAME: "InterMUN",
});
for (const key of ["INVITE_FROM", "INVITE_FROM_NAME", "INVITE_ARCHIVE_BCC", "MATERIALS_EXPORT_FROM", "SMTP_FROM"]) {
  delete process.env[key];
}

const sentMail = [];
let failArchiveSend = false;
let failRecipientSend = false;
const realCreateTransport = nodemailer.createTransport;
nodemailer.createTransport = () => ({
  async sendMail(message) {
    const isArchive = message.to === "information@seamun.com";
    if (isArchive && failArchiveSend) throw new Error("simulated archive SMTP failure");
    if (!isArchive && failRecipientSend) throw new Error("simulated recipient SMTP failure");
    sentMail.push(message);
    return { messageId: `<fake-${sentMail.length}@test>`, response: "250 fake", accepted: [message.to], rejected: [] };
  },
});

const loggedErrors = [];
const realConsoleError = console.error;
console.error = (...args) => loggedErrors.push(args);

after(() => {
  nodemailer.createTransport = realCreateTransport;
  console.error = realConsoleError;
  process.env = SAVED_ENV;
});

const tsTemplate = await import("../lib/invite-email.ts");
const mjsTemplate = await import("./lib/invite-email-template.mjs");
const tsInvite = await import("../lib/auth-invite.ts");
const mjsInvite = await import("./lib/invite-with-archive.mjs");

const FAKE_EMAIL = "fake.delegate@example.test";
const FAKE_TOKEN = "pkce_fake0123456789abcdef0123456789abcdef0123456789abcd";
const REDIRECT = "https://intermun.site/auth/set-password";
const SENT_AT = new Date("2026-10-10T07:55:00.000Z");
const ARCHIVE_SUBJECT = `[Archive] SEAMUN I 2027 InterMUN — set your password and join — to ${FAKE_EMAIL}`;
const REDACTED_CTA = `Set-password link sent to ${FAKE_EMAIL} — removed from this archive copy.`;
const recipient = { name: "Fake Delegate", email: FAKE_EMAIL, allocation: "DISEC · Fakeland" };

function ctaFor(type) {
  return `https://intermun.site/auth/confirm?token_hash=${FAKE_TOKEN}&type=${type}`;
}

function fakeAdmin() {
  const calls = [];
  return {
    calls,
    auth: {
      admin: {
        async generateLink(args) {
          calls.push(args);
          return {
            data: {
              user: { id: "00000000-0000-0000-0000-000000000000", email: args.email },
              properties: { hashed_token: FAKE_TOKEN, verification_type: args.type },
            },
            error: null,
          };
        },
      },
    },
  };
}

function assertArchiveClean(mail) {
  for (const part of [mail.subject, mail.text, mail.html]) {
    assert.doesNotMatch(part, /token_hash/i);
    assert.doesNotMatch(part, /\/auth\/confirm/i);
    assert.doesNotMatch(part, /\/auth\/v1\/verify/i);
    assert.doesNotMatch(part, /supabase\.co/i);
    assert.doesNotMatch(part, /https?:\/\//i);
    assert.ok(!part.includes(FAKE_TOKEN), "archive must not contain the hashed token");
  }
  assert.doesNotMatch(mail.html, /<a\s|href=/i);
}

function assertRecipientHasCta(mail, type) {
  const cta = ctaFor(type);
  assert.ok(mail.text.includes(cta), "recipient text must include the CTA URL");
  assert.ok(mail.html.includes(cta.replace(/&/g, "&amp;")), "recipient html must include the CTA href");
  assert.match(mail.html, /Set your InterMUN password<\/a>/);
}

for (const [label, tpl] of [["lib/invite-email.ts", tsTemplate], ["scripts invite-email-template.mjs", mjsTemplate]]) {
  describe(`template: ${label}`, () => {
    const original = tpl.buildSeamunIntermunInviteEmail({ actionLink: ctaFor("invite"), appName: "InterMUN", recipient });
    const archive = tpl.buildSeamunIntermunInviteArchiveEmail({ sentTo: FAKE_EMAIL, sentAt: SENT_AT, appName: "InterMUN", recipient });

    test("recipient copy keeps the working CTA", () => {
      assertRecipientHasCta(original, "invite");
      assert.ok(tpl.findArchiveEmailLeaks(original, [FAKE_TOKEN]).length > 0, "leak check must flag the live copy");
    });

    test("archive copy has no token, confirm URL, or verify URL", () => {
      assertArchiveClean(archive);
      assert.deepEqual(tpl.findArchiveEmailLeaks(archive, [ctaFor("invite"), FAKE_TOKEN]), []);
    });

    test("archive copy subject, banner, and redacted CTA", () => {
      assert.equal(archive.subject, ARCHIVE_SUBJECT);
      const banner = `Archive copy — the original was sent to ${FAKE_EMAIL} on 2026-10-10 07:55:00 UTC.`;
      assert.ok(archive.text.startsWith(banner));
      assert.ok(archive.html.includes(banner));
      assert.ok(archive.text.includes(REDACTED_CTA));
      assert.ok(archive.html.includes(REDACTED_CTA));
    });
  });
}

test("TS and script templates render identical output", () => {
  const args = { sentTo: FAKE_EMAIL, sentAt: SENT_AT, appName: "InterMUN", recipient };
  assert.deepEqual(tsTemplate.buildSeamunIntermunInviteArchiveEmail(args), mjsTemplate.buildSeamunIntermunInviteArchiveEmail(args));
  const live = { actionLink: ctaFor("invite"), appName: "InterMUN", recipient };
  assert.deepEqual(tsTemplate.buildSeamunIntermunInviteEmail(live), mjsTemplate.buildSeamunIntermunInviteEmail(live));
});

const sendPaths = [
  ["lib/auth-invite.ts inviteUserByEmailWithArchive", "invite", (admin) => tsInvite.inviteUserByEmailWithArchive(admin, { email: FAKE_EMAIL, redirectTo: REDIRECT, recipient })],
  ["lib/auth-invite.ts sendRecoverySetPasswordEmailWithArchive", "recovery", (admin) => tsInvite.sendRecoverySetPasswordEmailWithArchive(admin, { email: FAKE_EMAIL, redirectTo: REDIRECT, recipient })],
  ["scripts invite-with-archive.mjs inviteUserByEmailWithArchive", "invite", (admin) => mjsInvite.inviteUserByEmailWithArchive(admin, { email: FAKE_EMAIL, redirectTo: REDIRECT, recipient })],
];

for (const [label, type, run] of sendPaths) {
  describe(`send path: ${label}`, () => {
    beforeEach(() => {
      sentMail.length = 0;
      loggedErrors.length = 0;
      failArchiveSend = false;
      failRecipientSend = false;
    });

    test("sends two separate messages, no BCC, archive redacted", async () => {
      const result = await run(fakeAdmin());
      assert.equal(result.error, null);
      assert.equal(sentMail.length, 2);
      const [live, archive] = sentMail;
      for (const m of sentMail) {
        assert.equal(m.bcc, undefined);
        assert.equal(m.cc, undefined);
        assert.equal(m.from, "Information @ SEAMUN I 2027 <information@seamun.com>");
      }
      assert.equal(live.to, FAKE_EMAIL);
      assertRecipientHasCta(live, type);
      assert.equal(archive.to, "information@seamun.com");
      assert.equal(archive.subject, ARCHIVE_SUBJECT);
      assert.ok(archive.text.includes(REDACTED_CTA));
      assertArchiveClean(archive);
    });

    test("archive failure is logged and does not fail the recipient send", async () => {
      failArchiveSend = true;
      const result = await run(fakeAdmin());
      assert.equal(result.error, null);
      assert.equal(sentMail.length, 1);
      assert.equal(sentMail[0].to, FAKE_EMAIL);
      assert.ok(loggedErrors.some((args) => String(args[0]).includes("[invite-archive]")));
    });

    test("no archive copy when the recipient send fails", async () => {
      failRecipientSend = true;
      const result = await run(fakeAdmin());
      assert.ok(result.error);
      assert.equal(sentMail.length, 0);
    });
  });
}
