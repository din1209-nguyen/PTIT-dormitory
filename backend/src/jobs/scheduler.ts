import { logger } from '../config/logger.js';
import { runEmailRetry } from './emailRetry.job.js';
import { runInvoiceOverdue } from './invoiceOverdue.job.js';

export async function startScheduler() {
  const cron = await import('node-cron');

  cron.schedule('*/30 * * * *', () => {
    runEmailRetry();
  });

  cron.schedule('30 8 * * *', () => {
    runInvoiceOverdue();
  });

  logger.info('Background job scheduler started');
}
