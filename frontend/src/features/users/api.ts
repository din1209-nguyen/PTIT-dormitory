import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { User } from '@/types/user';
import type { PaginatedResponse } from '@/types/api';

export function useUsers(params: { page?: number; limit?: number; role?: string; status?: string; keyword?: string } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => apiClient.get<PaginatedResponse<User>>(`/users?${q}`).then(r => r.data.data),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => apiClient.get<{ data: User }>(`/users/${id}`).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; email: string; password: string; role: string; fullName?: string; gender?: string; className?: string; major?: string; academicYear?: string; department?: string; isFreshman?: boolean; }) => apiClient.post('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { username?: string; email?: string; role?: string } }) => apiClient.put(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useLockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/lock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/unlock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => apiClient.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['users', id] }),
  });
}

export function useImportUsersExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.post('/users/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function downloadUserTemplate() {
  return apiClient.get('/users/import-template', { responseType: 'blob' }).then(res => {
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  });
}
