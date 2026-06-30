import type { RequestHandler } from 'express';
import { ForbiddenError } from '../errors/index.js';

export function requirePermission(...codes: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Không đủ quyền truy cập'));
    }
    const has = codes.every((c) => req.user!.permissions.includes(c));
    if (!has) {
      return next(new ForbiddenError('Không đủ quyền truy cập'));
    }
    next();
  };
}
