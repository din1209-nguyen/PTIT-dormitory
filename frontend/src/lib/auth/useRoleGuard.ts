'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type Role } from './authStore';

const ROLE_DASHBOARDS: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager/students',
  STUDENT: '/student/profile',
};

export function useRoleGuard(allowedRoles: Role[]) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (user.forcePasswordChange && window.location.pathname !== '/force-change-password') {
      router.replace('/force-change-password');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace('/forbidden');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  return { user, isLoading, isAuthorized: !isLoading && isAuthenticated && user && allowedRoles.includes(user.role) };
}

export function getDashboardPath(role: Role): string {
  return ROLE_DASHBOARDS[role];
}
