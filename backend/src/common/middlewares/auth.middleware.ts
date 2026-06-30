import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../../config/jwt.js';
import { User } from '../../models/user.model.js';
import { UnauthorizedError } from '../errors/index.js';
import { ErrorCode } from '../errors/errorCodes.js';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Thiếu access token', ErrorCode.AUTH_UNAUTHORIZED);
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Access token hết hạn hoặc không hợp lệ', ErrorCode.AUTH_TOKEN_EXPIRED);
    }

    const user = await User.findById(payload.sub).select('tokenVersion status').lean();
    if (!user) {
      throw new UnauthorizedError('Không tìm thấy người dùng', ErrorCode.AUTH_UNAUTHORIZED);
    }
    if (user.status === 'LOCKED') {
      throw new UnauthorizedError('Tài khoản đã bị khóa', ErrorCode.AUTH_ACCOUNT_LOCKED);
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Token đã bị thu hồi', ErrorCode.AUTH_TOKEN_EXPIRED);
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
      tokenVersion: payload.tokenVersion,
    };

    next();
  } catch (err) {
    next(err);
  }
};
