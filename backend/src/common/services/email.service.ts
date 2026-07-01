import { logger } from '../../config/logger.js';
import { sendMail } from '../../integrations/mail/mail.client.js';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const sent = await sendMail({ to, subject, html });
    if (!sent) {
      logger.warn('[EmailService] SMTP is not configured; skipped email', { to, subject });
      return;
    }

    logger.info('[EmailService] Email sent', { to, subject });
  } catch (error) {
    logger.error('[EmailService] Failed to send email', { to, subject, error });
    throw error;
  }
}
