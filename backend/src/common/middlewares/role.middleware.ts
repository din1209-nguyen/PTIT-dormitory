import type { RequestHandler } from 'express';
import type { Role } from '../constants/roles.js';
import { ForbiddenError } from '../errors/index.js';

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Không đủ quyền hạn vai trò'));
    }
    next();
  };
}
