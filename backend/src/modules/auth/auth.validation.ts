import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Thiếu token'),
  newPassword: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  otp: z.string().length(6, 'OTP phải gồm 6 chữ số'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
});
