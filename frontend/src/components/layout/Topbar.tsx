'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Settings, KeyRound, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/authStore';
import apiClient from '@/lib/api/apiClient';
import { AUTH } from '@/lib/api/endpoints';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useChangePassword } from '@/features/auth/api';
import { roleLabel } from '@/components/common/Badge';
import { toast } from 'sonner';
import { getPageInfo } from '@/config/navigation';

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pwError, setPwError] = useState('');
  const changePwMut = useChangePassword();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageInfo = getPageInfo(pathname);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  async function handleLogout() {
    try {
      await apiClient.post(AUTH.LOGOUT);
    } catch {
      // ignore
    }
    clearAuth();
    router.replace('/login');
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError('');
    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get('currentPassword') as string;
    const newPassword = fd.get('newPassword') as string;
    const confirmPassword = fd.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) { setPwError('Mật khẩu xác nhận không khớp'); return; }
    if (newPassword.length < 6) { setPwError('Mật khẩu mới phải ít nhất 6 ký tự'); return; }

    try {
      await changePwMut.mutateAsync({ currentPassword, newPassword });
      toast.success('Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...');
      setTimeout(() => {
        setChangePasswordOpen(false);
        clearAuth();
        router.replace('/login');
      }, 1500);
    } catch {
      setPwError('Mật khẩu hiện tại không đúng');
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg-card px-6">
      <div className="flex items-center">
        {pageInfo ? (
          <h1 className="text-xl font-bold text-text-primary hidden sm:block">
            {pageInfo.title}
          </h1>
        ) : <div />}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            title="Cài đặt"
            className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border transition-colors ${settingsOpen ? 'bg-bg-page text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Settings size={18} />
          </button>

          {settingsOpen && (
            <div className="animate-dropdown-in absolute right-0 top-full mt-2 w-52 rounded-[var(--radius-sm)] border border-border bg-bg-card py-1 shadow-lg z-50">
              <button
                onClick={() => { setSettingsOpen(false); setChangePasswordOpen(true); setPwError(''); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-bg-page"
              >
                <KeyRound size={16} className="text-text-secondary" />
                Đổi mật khẩu
              </button>
              <button
                onClick={() => { setSettingsOpen(false); setAccountInfoOpen(true); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-bg-page"
              >
                <UserCircle size={16} className="text-text-secondary" />
                Thông tin tài khoản
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-from to-primary-to text-xs font-bold text-white">
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-text-primary">{user?.username}</p>
            <p className="text-xs text-text-secondary">{roleLabel(user?.role || '')}</p>
          </div>
        </div>
        <button
          onClick={() => setConfirmLogout(true)}
          title="Đăng xuất"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:text-accent-red transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>

      <Modal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Đổi mật khẩu">
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input label="Mật khẩu hiện tại" name="currentPassword" type="password" required />
          <Input label="Mật khẩu mới" name="newPassword" type="password" required />
          <Input label="Xác nhận mật khẩu mới" name="confirmPassword" type="password" required />
          {pwError && <p className="rounded-[var(--radius-sm)] bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{pwError}</p>}
          <Button type="submit" loading={changePwMut.isPending} className="mt-2">Đổi mật khẩu</Button>
        </form>
      </Modal>

      <Modal open={accountInfoOpen} onClose={() => setAccountInfoOpen(false)} title="Thông tin tài khoản">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-from to-primary-to text-xl font-bold text-white">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{user?.username}</p>
              <p className="text-sm text-text-secondary">{roleLabel(user?.role || '')}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-sm)] bg-bg-page p-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-text-secondary">Username:</span>
              <span className="font-medium text-text-primary">{user?.username}</span>
              <span className="text-text-secondary">Email:</span>
              <span className="font-medium text-text-primary">{user?.email || '—'}</span>
              <span className="text-text-secondary">Vai trò:</span>
              <span className="font-medium text-text-primary">{roleLabel(user?.role || '')}</span>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        title="Đăng xuất"
        message="Bạn có chắc muốn đăng xuất khỏi hệ thống?"
        variant="warning"
        confirmText="Đăng xuất"
      />
    </header>
  );
}
