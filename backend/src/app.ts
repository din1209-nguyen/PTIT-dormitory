import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './common/middlewares/error.middleware.js';
import { notFoundHandler } from './common/middlewares/notFound.middleware.js';
import apiRouter from './routes/index.js';
import './models/index.js';

const app = express();
app.set('trust proxy', true);

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

// Request logging
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Audit middleware (auto-capture write operations)
import { auditMiddleware } from './common/middlewares/audit.middleware.js';
app.use(auditMiddleware);

// API routes
app.use('/api', apiRouter);

// 404 for unmatched routes
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
