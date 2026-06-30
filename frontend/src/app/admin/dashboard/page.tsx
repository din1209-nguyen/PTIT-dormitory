'use client';


import { useAdminDashboard } from '@/features/dashboard/api';
import AdminUsersPage from '../users/page';

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  return (
    <div className="flex flex-col gap-6">
      <AdminUsersPage />
    </div>
  );
}