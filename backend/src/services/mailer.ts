import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { env } from "../config/env.js";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  pool: true,
  maxConnections: Math.max(1, Math.min(env.WORKER_CONCURRENCY, 5)),
});

export interface SendEmailInput {
  idempotencyKey: string;
  fromEmail: string;
  fromName?: string | null;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(input: SendEmailInput) {
  const result = await mailer.sendMail({
    from: input.fromName
      ? { name: input.fromName, address: input.fromEmail }
      : input.fromEmail,
    to: input.to,
    subject: input.subject,
    text: input.body,
    messageId: `<${input.idempotencyKey}@reachinbox-scheduler.local>`,
    headers: { "X-ReachInbox-Idempotency-Key": input.idempotencyKey },
  });

  return {
    messageId: result.messageId,
    previewUrl:
      nodemailer.getTestMessageUrl(result as unknown as SMTPTransport.SentMessageInfo) || null,
  };
}
