import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export type MailProvider = 'smtp' | 'brevo';

export interface SendMailResult {
  success: boolean;
  provider: MailProvider;
  messageId?: string;
  errorMessage?: string;
}

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

function getMailFrom(): string | undefined {
  return env.EMAIL_FROM || env.SMTP_FROM || (env.SMTP_USER ? `PTIT Dormitory <${env.SMTP_USER}>` : undefined);
}

function parseEmailAddress(value: string): { email: string; name?: string } {
  const match = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^<>@\s]+@[^<>@\s]+)>\s*$/);
  if (!match) return { email: value.trim() };

  const name = match[1]?.trim();
  return name ? { email: match[2], name } : { email: match[2] };
}

export function getMailProvider(): MailProvider {
  return env.EMAIL_PROVIDER;
}

export function isMailConfigured(): boolean {
  if (getMailProvider() === 'brevo') {
    return !!(env.BREVO_API_KEY && getMailFrom());
  }

  return !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && getSmtpPassword() && getMailFrom());
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
  if (getMailProvider() !== 'smtp' || !isMailConfigured()) return null;

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

async function sendWithSmtp(params: { to: string; subject: string; html: string }): Promise<SendMailResult> {
  const provider = 'smtp';
  const t = getTransporter();
  if (!t) return { success: false, provider, errorMessage: 'SMTP is not fully configured' };

  try {
    const info = await t.sendMail({ from: getMailFrom(), to: params.to, subject: params.subject, html: params.html });
    return { success: true, provider, messageId: info.messageId };
  } catch (err) {
    return { success: false, provider, errorMessage: err instanceof Error ? err.message : 'Unknown SMTP error' };
  }
}

async function sendWithBrevo(params: { to: string; subject: string; html: string }): Promise<SendMailResult> {
  const provider = 'brevo';
  const from = getMailFrom();
  if (!env.BREVO_API_KEY || !from) {
    return { success: false, provider, errorMessage: 'Brevo is not fully configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: parseEmailAddress(from),
        to: [parseEmailAddress(params.to)],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) as { messageId?: string; message?: string; code?: string } : {};
    if (!response.ok) {
      const message = payload.message || `Brevo API failed with status ${response.status}`;
      return { success: false, provider, errorMessage: payload.code ? `${payload.code}: ${message}` : message };
    }

    return { success: true, provider, messageId: payload.messageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown Brevo error';
    return { success: false, provider, errorMessage };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMail(params: { to: string; subject: string; html: string }): Promise<SendMailResult> {
  if (!isMailConfigured()) {
    return { success: false, provider: getMailProvider(), errorMessage: `${getMailProvider()} is not fully configured` };
  }

  return getMailProvider() === 'brevo' ? sendWithBrevo(params) : sendWithSmtp(params);
}

export async function verifyMailProvider() {
  if (!isMailConfigured()) {
    logger.warn('Email provider is not fully configured', { provider: getMailProvider() });
    return false;
  }

  if (getMailProvider() === 'brevo') {
    logger.info('Brevo email provider configured', { provider: 'brevo' });
    return true;
  }

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

export const verifyMailTransporter = verifyMailProvider;
