'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import apiClient from '@/lib/api/apiClient';
import { AUTH } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/auth/authStore';
import { getDashboardPath } from '@/lib/auth/useRoleGuard';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ApiError } from '@/lib/api/apiError';

const KTX_IMAGES = ['/ktx1.jpg', '/ktx2.jpg', '/ktx3.jpg'];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % KTX_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post(AUTH.LOGIN, { username, password });
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      
      if (user.forcePasswordChange) {
        router.replace('/force-change-password');
      } else {
        router.replace(getDashboardPath(user.role));
      }
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background slideshow */}
      {KTX_IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: currentImage === i ? 1 : 0 }}
        >
          <Image src={src} alt="" fill className="object-cover" priority={i === 0} />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B6FB0]/85 via-[#1387C9]/80 to-[#3FC1D7]/75" />

      <div className="animate-modal-content-in relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] bg-bg-card/95 p-8 shadow-2xl backdrop-blur-sm mx-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-from to-primary-to p-1 shadow-lg">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card">
              <Image src="/logo-ptit.webp" alt="PTIT" width={52} height={52} priority />
            </div>
          </div>
          <p className="text-sm text-text-secondary">Hệ thống quản lý ký túc xá</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Tên đăng nhập"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            autoComplete="username"
            required
          />
          <div className="relative">
            <Input
              label="Mật khẩu"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="rounded-[var(--radius-sm)] bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="mt-2 w-full">
            Đăng nhập
          </Button>

          <a href="/forgot-password" className="block text-center text-sm text-primary hover:underline">
            Quên mật khẩu?
          </a>
        </form>

        <p className="mt-6 text-center text-xs text-text-secondary">
          Học viện Công nghệ Bưu chính Viễn thông
        </p>
      </div>

      {/* Image indicators */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {KTX_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentImage(i)}
            className={`h-2 rounded-full transition-all ${currentImage === i ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
