import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
}

export function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!isMailConfigured()) {
    logger.warn('SMTP not configured — emails will be logged but not sent');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export async function sendMail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  await t.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to: params.to, subject: params.subject, html: params.html });
  return true;
}
