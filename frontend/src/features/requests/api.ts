import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { StudentRequestType } from '@/types/request';
import type { PaginatedResponse, ApiResponse } from '@/types/api';

export function useMyRequests() {
  return useQuery({
    queryKey: ['student-requests', 'me'],
    queryFn: () => apiClient.get<ApiResponse<StudentRequestType[]>>('/student-requests/me').then(r => r.data.data),
  });
}
export function useAllRequests(params: { page?: number; limit?: number; type?: string; status?: string } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
  return useQuery({
    queryKey: ['student-requests', params],
    queryFn: () => apiClient.get<PaginatedResponse<StudentRequestType>>(`/student-requests?${q}`).then(r => r.data.data),
  });
}
export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; title: string; content: string }) => apiClient.post('/student-requests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-requests'] }),
  });
}
export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; managerNote?: string } }) => apiClient.patch(`/student-requests/${id}/status`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-requests'] }),
  });
}
