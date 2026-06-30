import jwt from 'jsonwebtoken';
import { env } from './env.js';
import type { Role } from '../common/constants/roles.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  permissions: string[];
  tokenVersion: number;
}

function parseExpiryToSeconds(val: string): number {
  const match = val.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 900;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return num * (multipliers[unit] ?? 60);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ ...payload }, env.JWT_ACCESS_SECRET, {
    expiresIn: parseExpiryToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
