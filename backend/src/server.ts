import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { startScheduler } from './jobs/scheduler.js';
import { ensureUpcomingSemesters } from './modules/semesters/semester.service.js';

async function bootstrap() {
  await connectDatabase();
  startScheduler();
  await ensureUpcomingSemesters();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on ${env.SERVER_URL} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
