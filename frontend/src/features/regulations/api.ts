import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Regulation } from '@/types/regulation';
import type { ApiResponse } from '@/types/api';

export function useRegulations(filter?: { status?: string }) {
  const q = filter?.status ? `?status=${filter.status}` : '';
  return useQuery({
    queryKey: ['regulations', filter],
    queryFn: () => apiClient.get<ApiResponse<Regulation[]>>(`/regulations${q}`).then(r => r.data.data),
  });
}
export function usePublishedRegulations() {
  return useQuery({
    queryKey: ['regulations', 'published'],
    queryFn: () => apiClient.get<ApiResponse<Regulation[]>>('/regulations/published').then(r => r.data.data),
  });
}
export function useCreateRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string }) => apiClient.post('/regulations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regulations'] }),
  });
}
export function useUpdateRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Regulation> }) => apiClient.put(`/regulations/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regulations'] }),
  });
}
export function usePublishRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/regulations/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regulations'] }),
  });
}
export function useArchiveRegulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/regulations/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regulations'] }),
  });
}
