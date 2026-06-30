import crypto from 'node:crypto';
import { RefreshToken } from '../../models/refreshToken.model.js';
import { signAccessToken, type AccessTokenPayload } from '../../config/jwt.js';
import { logger } from '../../config/logger.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return signAccessToken(payload);
}

export async function createRefreshToken(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string },
): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return rawToken;
}

export async function rotateRefreshToken(
  oldRawToken: string,
  meta: { ipAddress?: string; userAgent?: string },
): Promise<{ newRawToken: string; userId: string } | null> {
  const oldHash = hashToken(oldRawToken);
  const existing = await RefreshToken.findOne({ tokenHash: oldHash });

  if (!existing) return null;

  // Reuse detection: if already revoked, someone stole the token
  if (existing.revokedAt) {
    logger.warn('Refresh token reuse detected — revoking all sessions for user', {
      userId: existing.userId.toString(),
    });
    await RefreshToken.updateMany(
      { userId: existing.userId, revokedAt: null },
      { revokedAt: new Date() },
    );
    return null;
  }

  if (existing.expiresAt < new Date()) return null;

  const newRawToken = crypto.randomBytes(40).toString('hex');
  const newHash = hashToken(newRawToken);

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newHash;
  await existing.save();

  await RefreshToken.create({
    userId: existing.userId,
    tokenHash: newHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { newRawToken, userId: existing.userId.toString() };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

export { hashToken };
