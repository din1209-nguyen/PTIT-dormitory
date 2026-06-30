'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import apiClient from '@/lib/api/apiClient';
import { AUTH } from '@/lib/api/endpoints';

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post(AUTH.FORGOT_PASSWORD, { email });
      setStep('otp');
      setCountdown(15 * 60);
      setResendCooldown(60);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await apiClient.post(AUTH.FORGOT_PASSWORD, { email });
      setCountdown(15 * 60);
      setResendCooldown(60);
    } catch {
      setError('Không thể gửi lại OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Vui lòng nhập đủ 6 số'); return; }
    setLoading(true);
    try {
      const res = await apiClient.post(AUTH.VERIFY_OTP, { email, otp });
      setToken(res.data.data.token);
      setStep('reset');
    } catch {
      setError('Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (newPassword.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự'); return; }
    setLoading(true);
    try {
      await apiClient.post(AUTH.RESET_PASSWORD, { token, newPassword });
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại từ đầu.');
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const stepLabels: Record<Step, string> = { email: 'Nhập email', otp: 'Xác nhận OTP', reset: 'Đặt lại mật khẩu' };
  const steps: Step[] = ['email', 'otp', 'reset'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image src="/logo-ptit.png" alt="PTIT" width={64} height={64} priority />
          </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s ? 'bg-primary text-white' : steps.indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-border text-text-secondary'
              }`}>{i + 1}</div>
              {i < steps.length - 1 && <div className={`h-0.5 w-6 transition-colors ${steps.indexOf(step) > i ? 'bg-green-500' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
        <p className="mb-4 text-center text-sm text-text-secondary">{stepLabels[step]}</p>

        {success ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-green-600">Đặt lại mật khẩu thành công! Đang chuyển về trang đăng nhập...</p>
          </div>
        ) : (
          <>
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <Input label="Email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ptit.edu.vn" required />
                {error && <p className="rounded-[var(--radius-sm)] bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">{loading ? 'Đang gửi...' : 'Gửi mã OTP'}</Button>
                <a href="/login" className="block text-center text-sm text-text-secondary hover:text-primary">Quay lại đăng nhập</a>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <p className="text-center text-sm text-text-secondary">
                  Mã OTP đã được gửi đến <strong className="text-text-primary">{email}</strong>
                </p>
                <Input
                  ref={otpRef}
                  label="Mã OTP (6 số)"
                  name="otp"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-[0.5em]"
                  required
                />
                {countdown > 0 && (
                  <p className="text-center text-xs text-text-secondary">Mã hết hạn sau: <span className="font-medium text-primary">{formatTime(countdown)}</span></p>
                )}
                {error && <p className="rounded-[var(--radius-sm)] bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">{loading ? 'Đang xác nhận...' : 'Xác nhận OTP'}</Button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-center text-sm text-text-secondary hover:text-primary disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại OTP'}
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <Input label="Mật khẩu mới" name="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                <Input label="Xác nhận mật khẩu" name="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                {error && <p className="rounded-[var(--radius-sm)] bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">{loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}</Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
