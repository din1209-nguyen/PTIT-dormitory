import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response.js';
import { REFRESH_COOKIE_NAME, getRefreshCookieOptions } from '../../config/cookie.js';
import * as authService from './auth.service.js';

export async function loginHandler(req: Request, res: Response) {
  const { username, password } = req.body;
  const result = await authService.login(username, password, {
    ipAddress: req.ip === '::1' ? '127.0.0.1' : req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
  sendSuccess(res, { accessToken: result.accessToken, user: result.user });
}

export async function refreshHandler(req: Request, res: Response) {
  const oldToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!oldToken) {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập hết hạn', errorCode: 'AUTH_REFRESH_TOKEN_EXPIRED' });
    return;
  }

  const result = await authService.refresh(oldToken, {
    ipAddress: req.ip === '::1' ? '127.0.0.1' : req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
  sendSuccess(res, { accessToken: result.accessToken });
}

export async function logoutHandler(req: Request, res: Response) {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (token) await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  sendSuccess(res, null, 'Đã đăng xuất');
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, null, 'Nếu email tồn tại, mã OTP đã được gửi');
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const token = await authService.verifyOtp(req.body.email, req.body.otp);
  sendSuccess(res, { token });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, null, 'Đã đặt lại mật khẩu');
}

export async function changePasswordHandler(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  sendSuccess(res, null, 'Đã đổi mật khẩu — vui lòng đăng nhập lại');
}

export async function getMeHandler(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id);
  sendSuccess(res, user);
}
