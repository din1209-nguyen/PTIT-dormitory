'use client';

import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/lib/auth/authStore';
import { getDashboardPath } from '@/lib/auth/useRoleGuard';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-page">
      <ShieldOff size={48} className="text-accent-red" />
      <p className="text-sm text-text-secondary">Bạn không có quyền truy cập trang này.</p>
      <Button onClick={() => router.replace(user ? getDashboardPath(user.role) : '/login')}>
        Quay về trang chính
      </Button>
    </div>
  );
}
