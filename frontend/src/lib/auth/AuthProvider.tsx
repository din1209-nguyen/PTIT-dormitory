'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from './authStore';
import { clearRefreshFailureCache, refreshAccessToken } from '../api/refreshTokenManager';
import apiClient from '../api/apiClient';
import { AUTH } from '../api/endpoints';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    async function tryRestore() {
      try {
        const token = await refreshAccessToken();
        if (!token || cancelled) {
          clearAuth();
          return;
        }

        useAuthStore.getState().setAccessToken(token);
        const res = await apiClient.get(AUTH.ME);
        if (!cancelled) {
          clearRefreshFailureCache();
          setAuth(res.data.data, token);
        }
      } catch {
        if (!cancelled) clearAuth();
      }
    }

    tryRestore();
    return () => {
      cancelled = true;
    };
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
}
