'use client';

import axios from 'axios';
import { useAuthStore } from '../auth/authStore';
import { clearRefreshFailureCache, refreshAccessToken } from './refreshTokenManager';
import { ApiError, type ApiErrorData } from './apiError';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      const url = original.url || '';
      const isAuthEndpoint = url.includes('/auth/login')
        || url.includes('/auth/refresh')
        || url.includes('/auth/me')
        || url.includes('/auth/forgot-password')
        || url.includes('/auth/verify-otp');

      if (!isAuthEndpoint) {
        original._retry = true;
        const newToken = await refreshAccessToken();

        if (newToken) {
          clearRefreshFailureCache();
          useAuthStore.getState().setAccessToken(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        }

        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    const data = error.response?.data as ApiErrorData | undefined;
    if (data && data.success === false) {
      return Promise.reject(new ApiError(error.response.status, data));
    }

    return Promise.reject(error);
  },
);

export default apiClient;
