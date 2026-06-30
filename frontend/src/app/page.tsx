'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/authStore';
import { getDashboardPath } from '@/lib/auth/useRoleGuard';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      router.replace(getDashboardPath(user.role));
    } else {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-text-secondary">Redirecting...</p>
    </div>
  );
}
