import { retryFailedEmails } from '../integrations/mail/mail.service.js';
import { logger } from '../config/logger.js';

export async function runEmailRetry() {
  try {
    await retryFailedEmails(3);
  } catch (err) {
    logger.error('[Job] Email retry failed', { error: err });
  }
}
