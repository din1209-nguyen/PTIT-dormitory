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
    const result = await sendMail({ to, subject, html });
    if (!result.success) {
      logger.warn('[EmailService] Email was not sent', { to, subject, provider: result.provider, error: result.errorMessage });
      return;
    }

    logger.info('[EmailService] Email sent', { to, subject, provider: result.provider, messageId: result.messageId });
  } catch (error) {
    logger.error('[EmailService] Failed to send email', { to, subject, error });
    throw error;
  }
}
