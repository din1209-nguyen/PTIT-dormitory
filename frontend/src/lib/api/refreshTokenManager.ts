import axios from 'axios';
import { AUTH } from './endpoints';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
const REFRESH_FAILED_KEY = 'ptit_auth_refresh_failed';
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (typeof window !== 'undefined' && sessionStorage.getItem(REFRESH_FAILED_KEY) === '1') {
    return null;
  }

  try {
    const res = await axios.post(`${API_BASE}${AUTH.REFRESH}`, {}, { withCredentials: true });
    const token = res.data?.data?.accessToken ?? null;
    if (token && typeof window !== 'undefined') {
      sessionStorage.removeItem(REFRESH_FAILED_KEY);
    }
    return token;
  } catch {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(REFRESH_FAILED_KEY, '1');
    }
    return null;
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function clearRefreshFailureCache() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(REFRESH_FAILED_KEY);
  }
}
