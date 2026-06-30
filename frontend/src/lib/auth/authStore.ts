import { create } from 'zustand';

export type Role = 'ADMIN' | 'MANAGER' | 'STUDENT';

interface User {
  id: string;
  username: string;
  email?: string;
  role: Role;
  permissions: string[];
  forcePasswordChange?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (user, accessToken) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('ptit_auth_refresh_failed');
    }
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
