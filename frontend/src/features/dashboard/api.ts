import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { ManagerDashboard, AdminDashboard, StudentDashboard } from '@/types/report';
import type { ApiResponse } from '@/types/api';

export function useManagerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: () => apiClient.get<ApiResponse<ManagerDashboard>>('/dashboard/manager').then(r => r.data.data),
  });
}
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => apiClient.get<ApiResponse<AdminDashboard>>('/dashboard/admin').then(r => r.data.data),
  });
}
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: () => apiClient.get<ApiResponse<StudentDashboard>>('/dashboard/student').then(r => r.data.data),
  });
}
