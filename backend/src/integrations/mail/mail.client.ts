import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let transporter: Transporter | null = null;

function getSmtpSecure(): boolean {
  return env.SMTP_SECURE ?? env.SMTP_PORT === 465;
}

function isGmailSmtp(): boolean {
  return env.SMTP_HOST?.toLowerCase() === 'smtp.gmail.com';
}

function getSmtpPassword(): string | undefined {
  if (!env.SMTP_PASS) return undefined;
  return isGmailSmtp() ? env.SMTP_PASS.replace(/\s+/g, '') : env.SMTP_PASS;
}

function getSmtpFrom(): string | undefined {
  return env.SMTP_FROM || (env.SMTP_USER ? `PTIT Dormitory <${env.SMTP_USER}>` : undefined);
}

export function isMailConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && getSmtpPassword());
}

function logSmtpConfigurationHints() {
  if (!env.SMTP_HOST || !env.SMTP_PORT) return;

  const secure = getSmtpSecure();
  if (env.SMTP_PORT === 465 && !secure) {
    logger.warn('SMTP port 465 usually requires SMTP_SECURE=true');
  }
  if (env.SMTP_PORT === 587 && secure) {
    logger.warn('SMTP port 587 usually requires SMTP_SECURE=false for STARTTLS');
  }
  if (isGmailSmtp() && env.SMTP_PASS && /\s/.test(env.SMTP_PASS)) {
    logger.info('Whitespace was removed from Gmail SMTP app password before authentication');
  }
}

export function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!isMailConfigured()) {
    logger.warn('SMTP is not fully configured; emails will be logged as failed');
    return null;
  }

  logSmtpConfigurationHints();
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: getSmtpSecure(),
    auth: { user: env.SMTP_USER, pass: getSmtpPassword() },
    connectionTimeout: env.SMTP_TIMEOUT_MS,
    greetingTimeout: env.SMTP_TIMEOUT_MS,
    socketTimeout: env.SMTP_TIMEOUT_MS,
  });
  return transporter;
}

export async function sendMail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: getSmtpFrom(), to: params.to, subject: params.subject, html: params.html });
  return true;
}

export async function verifyMailTransporter() {
  const t = getTransporter();
  if (!t) return false;

  try {
    await t.verify();
    logger.info('SMTP transporter verified successfully');
    return true;
  } catch (err) {
    logger.error('SMTP transporter verification failed', { error: err });
    return false;
  }
}
