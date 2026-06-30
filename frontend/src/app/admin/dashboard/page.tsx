'use client';

import AdminUsersPage from '../users/page';

// Hiển thị màn hình tổng quan admin bằng danh sách quản trị người dùng
export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <AdminUsersPage />
    </div>
  );
}
