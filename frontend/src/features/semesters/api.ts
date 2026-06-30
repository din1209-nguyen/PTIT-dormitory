import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Semester } from '@/types/semester';
import type { PaginatedResponse } from '@/types/api';

export function useSemesters(params: { page?: number; limit?: number; status?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, String(v)); });
  return useQuery({
    queryKey: ['semesters', params],
    queryFn: () => apiClient.get<PaginatedResponse<Semester>>(`/semesters?${query}`).then(r => r.data.data),
  });
}

export function useActivateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/semesters/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useUpdateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { startDate: string; endDate: string } }) => apiClient.patch(`/semesters/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });
}

export function useRevertSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/semesters/${id}/revert`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['semesters'] }),
  });
}
