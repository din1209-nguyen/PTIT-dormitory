import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../errors/index.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errorCode: ErrorCode.VALIDATION_ERROR,
      errors,
    });
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Lỗi máy chủ nội bộ' : err.message,
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
  });
};
