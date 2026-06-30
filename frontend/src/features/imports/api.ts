import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { ImportBatch, ImportRowError } from '@/types/import';
import type { ApiResponse } from '@/types/api';

export function useImportBatches(semesterId?: string) {
  return useQuery({
    queryKey: ['import-batches', semesterId],
    queryFn: () => {
      const q = semesterId ? `?semesterId=${semesterId}` : '';
      return apiClient.get<ApiResponse<ImportBatch[]>>(`/import-batches${q}`).then(r => r.data.data);
    },
  });
}

export function useBatchErrors(batchId: string) {
  return useQuery({
    queryKey: ['import-batch-errors', batchId],
    queryFn: () => apiClient.get<ApiResponse<ImportRowError[]>>(`/import-batches/${batchId}/errors`).then(r => r.data.data),
    enabled: !!batchId,
  });
}

export function useImportExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.post('/students/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['import-batches'] });
      qc.invalidateQueries({ queryKey: ['room-assignments'] });
    },
  });
}
