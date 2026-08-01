// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
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

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  /** Overrides SMTP_FROM / MATERIALS_EXPORT_FROM for this message. */
  from?: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_configured" | "send_failed" }> {
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
      from: args.from?.trim() || cfg.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      replyTo: args.replyTo,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "send_failed" };
  }
}
