import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function getSmtpSecure(): boolean {
  return env.SMTP_SECURE ?? env.SMTP_PORT === 465;
}

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: getSmtpSecure(), // 465 uses SSL, 587 usually uses STARTTLS
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!transporter) {
    console.warn(`[EmailService] SMTP chưa được cấu hình. Bỏ qua gửi email đến: ${to}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || `"Ký túc xá PTIT" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] Đã gửi email đến ${to} (MessageId: ${info.messageId})`);
  } catch (error) {
    console.error(`[EmailService] Lỗi khi gửi email đến ${to}:`, error);
  }
}
