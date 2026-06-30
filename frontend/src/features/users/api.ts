import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { User } from '@/types/user';
import type { PaginatedResponse } from '@/types/api';

// Lấy danh sách người dùng theo bộ lọc và phân trang
export function useUsers(params: { page?: number; limit?: number; role?: string; status?: string; keyword?: string } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => apiClient.get<PaginatedResponse<User>>(`/users?${q}`).then(r => r.data.data),
  });
}

// Lấy chi tiết người dùng khi có id hợp lệ
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiClient.get<{ data: User }>(`/users/${id}`).then(r => r.data.data),
    enabled: !!id,
  });
}

// Tạo người dùng mới và làm mới danh sách người dùng
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; email: string; password: string; role: string; fullName?: string; gender?: string; phone?: string; address?: string; className?: string; major?: string; academicYear?: string; department?: string; isFreshman?: boolean; }) => apiClient.post('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// Cập nhật thông tin người dùng và làm mới cache liên quan
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { username?: string; email?: string; role?: string } }) => apiClient.put(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// Khóa tài khoản người dùng
export function useLockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/lock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// Mở khóa tài khoản người dùng
export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/unlock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// Đặt lại mật khẩu người dùng
export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => apiClient.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['users', id] }),
  });
}
