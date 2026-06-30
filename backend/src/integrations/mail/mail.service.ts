import { EmailLog } from '../../models/emailLog.model.js';
import { EmailStatus } from '../../common/constants/enums.js';
import { sendMail, isMailConfigured } from './mail.client.js';
import { logger } from '../../config/logger.js';

export async function queueEmail(params: { recipientEmail: string; subject: string; content: string }) {
  try {
    const log = await EmailLog.create({
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      content: params.content,
      status: EmailStatus.PENDING,
    });

    if (isMailConfigured()) {
      try {
        await sendMail({ to: params.recipientEmail, subject: params.subject, html: params.content });
        log.status = EmailStatus.SENT;
        log.sentAt = new Date();
        await log.save();
      } catch (err) {
        log.status = EmailStatus.FAILED;
        log.errorMessage = err instanceof Error ? err.message : 'Unknown error';
        await log.save();
      }
    }

    return log;
  } catch (err) {
    logger.error('Failed to queue email', { error: err });
  }
}

export async function retryFailedEmails(maxRetries = 3) {
  const failedEmails = await EmailLog.find({
    status: EmailStatus.FAILED,
    retryCount: { $lt: maxRetries },
  });

  let retried = 0;
  for (const log of failedEmails) {
    try {
      const sent = await sendMail({ to: log.recipientEmail, subject: log.subject, html: log.content });
      if (sent) {
        log.status = EmailStatus.SENT;
        log.sentAt = new Date();
      } else {
        log.retryCount += 1;
      }
    } catch (err) {
      log.retryCount += 1;
      log.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    }
    await log.save();
    retried++;
  }

  if (retried > 0) logger.info(`[EmailRetry] Retried ${retried} emails`);
}
