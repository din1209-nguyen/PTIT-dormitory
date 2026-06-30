'use client';

import type { ReactNode } from 'react';
import { useRoleGuard } from '@/lib/auth/useRoleGuard';
import { PageShell } from '@/components/layout/PageShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthorized, isLoading } = useRoleGuard(['ADMIN']);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-text-secondary">Loading...</div>;
  }

  if (!isAuthorized) return null;

  return <PageShell role="ADMIN">{children}</PageShell>;
}
