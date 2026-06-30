import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { ActivityLog } from '@/types/auditLog';
import type { PaginatedResponse } from '@/types/api';

export function useAuditLogs(params: {
  page?: number; limit?: number;
  userId?: string; action?: string; entityName?: string;
  startDate?: string; endDate?: string;
} = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => apiClient.get<PaginatedResponse<ActivityLog>>(`/audit-logs?${q}`).then(r => r.data.data),
  });
}
