import type { CookieOptions } from 'express';
import { env } from './env.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: SEVEN_DAYS_MS,
  };
}
