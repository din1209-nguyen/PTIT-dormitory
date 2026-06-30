'use client';

import type { ReactNode } from 'react';
import { useRoleGuard } from '@/lib/auth/useRoleGuard';
import { PageShell } from '@/components/layout/PageShell';

import { Loader2 } from 'lucide-react';

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { isAuthorized, isLoading } = useRoleGuard(['STUDENT']);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <PageShell role="STUDENT">{children}</PageShell>;
}
