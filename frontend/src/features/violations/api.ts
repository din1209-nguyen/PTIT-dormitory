import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Violation } from '@/types/violation';
import type { PaginatedResponse, ApiResponse } from '@/types/api';

export function useViolations(params: { page?: number; limit?: number; studentId?: string; status?: string } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
  return useQuery({
    queryKey: ['violations', params],
    queryFn: () => apiClient.get<PaginatedResponse<Violation>>(`/violations?${q}`).then(r => r.data.data),
  });
}
export function useMyViolations() {
  return useQuery({
    queryKey: ['violations', 'me'],
    queryFn: () => apiClient.get<ApiResponse<Violation[]>>('/violations/me').then(r => r.data.data),
  });
}
export function useCreateViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/violations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['violations'] }),
  });
}
export function useUpdateViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.put(`/violations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['violations'] }),
  });
}
