import { EmailLog, type IEmailLog } from '../../models/emailLog.model.js';
import { EmailStatus } from '../../common/constants/enums.js';
import { sendMail } from './mail.client.js';
import { logger } from '../../config/logger.js';

const RETRY_DELAY_MS = 5 * 60 * 1000;

function getNextAttemptAt(retryCount: number) {
  return new Date(Date.now() + RETRY_DELAY_MS * Math.max(1, retryCount));
}

async function deliverEmailLog(log: IEmailLog) {
  const result = await sendMail({ to: log.recipientEmail, subject: log.subject, html: log.content });

  log.provider = result.provider;
  log.messageId = result.messageId;
  if (result.success) {
    log.status = EmailStatus.SENT;
    log.sentAt = new Date();
    log.errorMessage = undefined;
    log.nextAttemptAt = undefined;
  } else {
    log.status = EmailStatus.FAILED;
    log.retryCount += 1;
    log.errorMessage = result.errorMessage || 'Unknown email delivery error';
    log.nextAttemptAt = getNextAttemptAt(log.retryCount);
  }

  await log.save();
  return log;
}

export async function queueEmail(params: { recipientEmail: string; subject: string; content: string }) {
  try {
    const log = await EmailLog.create({
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      content: params.content,
      status: EmailStatus.PENDING,
    });

    void deliverEmailLog(log).catch((err) => {
      logger.error('Failed to deliver queued email', { emailLogId: log.id, error: err });
    });

    return log;
  } catch (err) {
    logger.error('Failed to queue email', { error: err });
  }
}

export async function retryFailedEmails(maxRetries = 3) {
  const now = new Date();
  const emails = await EmailLog.find({
    $or: [
      { status: EmailStatus.PENDING },
      {
        status: EmailStatus.FAILED,
        retryCount: { $lt: maxRetries },
        $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }],
      },
    ],
  }).limit(50);

  let processed = 0;
  for (const log of emails) {
    await deliverEmailLog(log);
    processed++;
  }

  if (processed > 0) logger.info(`[EmailRetry] Processed ${processed} emails`);
}
