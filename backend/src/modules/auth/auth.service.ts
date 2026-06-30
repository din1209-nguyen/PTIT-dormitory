import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { User } from '../../models/user.model.js';
import { RolePermission } from '../../models/rolePermission.model.js';
import { Permission } from '../../models/permission.model.js';
import { PasswordResetToken } from '../../models/passwordResetToken.model.js';
import { AppError, UnauthorizedError, NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { UserStatus } from '../../common/constants/statuses.js';
import type { Role } from '../../common/constants/roles.js';
import { logger } from '../../config/logger.js';
import { logActivity } from '../../common/utils/auditLogger.js';
import { AuditAction } from '../../common/constants/enums.js';
import { env } from '../../config/env.js';
import { queueEmail } from '../../integrations/mail/mail.service.js';
import {
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  hashToken,
} from './token.service.js';

async function getPermissionsForRole(role: Role): Promise<string[]> {
  const rps = await RolePermission.find({ role }).populate<{ permissionId: { code: string } }>('permissionId', 'code').lean();
  return rps.map((rp) => rp.permissionId.code);
}

export async function login(
  username: string,
  password: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const user = await User.findOne({ username }).select('+passwordHash');
  if (!user) {
    throw new UnauthorizedError('Sai tên đăng nhập hoặc mật khẩu', ErrorCode.AUTH_INVALID_CREDENTIALS);
  }
  if (user.status === UserStatus.LOCKED) {
    throw new AppError(403, 'Tài khoản đã bị khóa', ErrorCode.AUTH_ACCOUNT_LOCKED);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    logActivity({ action: AuditAction.LOGIN_FAILED, description: `Login failed for ${username}`, ipAddress: meta.ipAddress });
    throw new UnauthorizedError('Sai tên đăng nhập hoặc mật khẩu', ErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  if (user.status === UserStatus.INACTIVE) {
    user.status = UserStatus.ACTIVE;
  }
  user.lastLoginAt = new Date();
  await user.save();
  logActivity({ userId: user.id, action: AuditAction.LOGIN_SUCCESS, description: `${username} logged in`, ipAddress: meta.ipAddress });

  const permissions = await getPermissionsForRole(user.role as Role);
  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role as Role,
    permissions,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = await createRefreshToken(user.id, meta);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions,
      forcePasswordChange: user.forcePasswordChange,
    },
  };
}

export async function refresh(
  oldRawToken: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const result = await rotateRefreshToken(oldRawToken, meta);
  if (!result) {
    throw new UnauthorizedError('Phiên đăng nhập hết hạn', ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED);
  }

  const user = await User.findById(result.userId);
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new UnauthorizedError('Người dùng không khả dụng', ErrorCode.AUTH_UNAUTHORIZED);
  }

  const permissions = await getPermissionsForRole(user.role as Role);
  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role as Role,
    permissions,
    tokenVersion: user.tokenVersion,
  });

  return { accessToken, refreshToken: result.newRawToken };
}

export async function logout(rawToken: string) {
  await revokeRefreshToken(rawToken);
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  if (!user) return;

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const tokenHash = hashToken(otp);

  await PasswordResetToken.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  logger.info(`[DEV] OTP for ${email}: ${otp}`);

  await queueEmail({
    recipientEmail: email,
    subject: 'PTIT Dormitory - Mã xác nhận đặt lại mật khẩu',
    content: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1B2330; margin-bottom: 16px;">Đặt lại mật khẩu</h2>
        <p style="color: #555; font-size: 14px;">Mã xác nhận (OTP) của bạn là:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1387C9;">${otp}</span>
        </div>
        <p style="color: #555; font-size: 14px;">Mã này có hiệu lực trong <strong>15 phút</strong>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `,
  });
}

export async function verifyOtp(email: string, otp: string) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(400, 'Mã OTP không hợp lệ', ErrorCode.AUTH_TOKEN_EXPIRED);

  const otpHash = hashToken(otp);
  const resetToken = await PasswordResetToken.findOne({
    userId: user.id,
    tokenHash: otpHash,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) throw new AppError(400, 'Mã OTP không đúng hoặc đã hết hạn', ErrorCode.AUTH_TOKEN_EXPIRED);

  resetToken.usedAt = new Date();
  await resetToken.save();

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await PasswordResetToken.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return rawToken;
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const resetToken = await PasswordResetToken.findOne({ tokenHash });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError(400, 'Mã đặt lại không hợp lệ hoặc đã hết hạn', ErrorCode.AUTH_TOKEN_EXPIRED);
  }

  const user = await User.findById(resetToken.userId).select('+passwordHash');
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;
  await user.save();

  resetToken.usedAt = new Date();
  await resetToken.save();

  await revokeAllUserTokens(user.id);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(400, 'Mật khẩu hiện tại không đúng', ErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;
  user.forcePasswordChange = false;
  await user.save();

  await revokeAllUserTokens(user.id);
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('Không tìm thấy người dùng', ErrorCode.USER_NOT_FOUND);

  const permissions = await getPermissionsForRole(user.role as Role);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions,
    lastLoginAt: user.lastLoginAt,
    forcePasswordChange: user.forcePasswordChange,
  };
}
