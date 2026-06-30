import type { Request, Response, NextFunction } from 'express';
import { ActivityLog } from '../../models/activityLog.model.js';
import { logger } from '../../config/logger.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'secret']);

function sanitizeBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) sanitized[k] = '***';
    else sanitized[k] = v;
  }
  const json = JSON.stringify(sanitized);
  if (json.length > 10240) return { _truncated: true, _size: json.length };
  return sanitized;
}

function deriveEntityName(path: string): string {
  const segments = path.replace(/^\/api\//, '').split('/');
  const first = segments[0] || '';
  return first.replace(/-/g, '_').replace(/s$/, '').replace(/^(.)/, (c) => c.toUpperCase());
}

function mapMethodToAction(method: string): string {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT': case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method;
  }
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!WRITE_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const fullPath = req.baseUrl + req.path;
    if (fullPath.includes('/auth/login') || fullPath.includes('/auth/refresh')) return;

    ActivityLog.create({
      userId: req.user?.id,
      action: mapMethodToAction(req.method),
      entityName: deriveEntityName(fullPath),
      entityId: req.params?.id,
      description: `${req.method} ${fullPath}`,
      newValue: sanitizeBody(req.body),
      ipAddress: req.ip === '::1' ? '127.0.0.1' : req.ip,
    }).catch((err) => {
      logger.error('Audit middleware failed', { error: err });
    });
  });

  next();
}
