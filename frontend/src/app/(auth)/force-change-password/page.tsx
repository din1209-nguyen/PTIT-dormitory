'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import apiClient from '@/lib/api/apiClient';
import { AUTH } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/auth/authStore';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ApiError } from '@/lib/api/apiError';

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải dài ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post(AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        clearAuth();
        router.replace('/login');
      }, 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B6FB0] via-[#1387C9] to-[#3FC1D7]">
        <div className="animate-modal-content-in relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] bg-bg-card p-8 shadow-2xl mx-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-status-completed-bg text-status-completed-text text-3xl">
              ✓
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-text-primary">Đổi mật khẩu thành công!</h2>
          <p className="text-sm text-text-secondary mb-6">Tài khoản của bạn đã được bảo mật. Đang chuyển hướng về trang đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B6FB0] via-[#1387C9] to-[#3FC1D7]">
      <div className="animate-modal-content-in relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] bg-bg-card p-8 shadow-2xl mx-4">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-from to-primary-to p-1 shadow-lg">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card">
              <Image src="/logo-ptit.webp" alt="PTIT" width={40} height={40} priority />
            </div>
          </div>
          <p className="text-sm text-text-secondary text-center">
            Xin chào <span className="font-semibold text-primary">{user?.username}</span>, <br />
            Bạn cần đổi mật khẩu trong lần đăng nhập đầu tiên để bảo vệ tài khoản.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Input
              label="Mật khẩu hiện tại"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              required
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary">
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Mật khẩu mới"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              required
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary">
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Xác nhận mật khẩu mới"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary">
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="rounded-[var(--radius-sm)] bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="mt-4 w-full">
            Đổi mật khẩu
          </Button>
          
          <button 
            type="button" 
            onClick={() => { clearAuth(); router.replace('/login'); }}
            className="mt-2 w-full py-2 text-sm text-text-secondary hover:text-primary transition-colors"
          >
            Đăng xuất
          </button>
        </form>
      </div>
    </div>
  );
}
