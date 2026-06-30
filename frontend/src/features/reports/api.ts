import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { ResidenceReport, CapacityReport, UtilityReport, PaymentReport, ViolationReport, RequestReport } from '@/types/report';
import type { ApiResponse } from '@/types/api';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  return q.toString();
}

export function useResidenceReport(semesterId?: string) {
  return useQuery({
    queryKey: ['reports', 'residence', semesterId],
    queryFn: () => apiClient.get<ApiResponse<ResidenceReport>>(`/reports/residence?${buildQuery({ semesterId })}`).then(r => r.data.data),
  });
}
export function useDormitoryCapacityReport(semesterId?: string) {
  return useQuery({
    queryKey: ['reports', 'dormitory-capacity', semesterId],
    queryFn: () => apiClient.get<ApiResponse<CapacityReport>>(`/reports/dormitory-capacity?${buildQuery({ semesterId })}`).then(r => r.data.data),
  });
}
export function useUtilityReport(params: { month?: number; year?: number } = {}) {
  return useQuery({
    queryKey: ['reports', 'utility', params],
    queryFn: () => apiClient.get<ApiResponse<UtilityReport>>(`/reports/utility?${buildQuery(params)}`).then(r => r.data.data),
  });
}
export function usePaymentReport(params: { month?: number; year?: number } = {}) {
  return useQuery({
    queryKey: ['reports', 'payments', params],
    queryFn: () => apiClient.get<ApiResponse<PaymentReport>>(`/reports/payments?${buildQuery(params)}`).then(r => r.data.data),
  });
}
export function useViolationReport(semesterId?: string) {
  return useQuery({
    queryKey: ['reports', 'violations', semesterId],
    queryFn: () => apiClient.get<ApiResponse<ViolationReport>>(`/reports/violations?${buildQuery({ semesterId })}`).then(r => r.data.data),
  });
}
export function useRequestReport(semesterId?: string) {
  return useQuery({
    queryKey: ['reports', 'requests', semesterId],
    queryFn: () => apiClient.get<ApiResponse<RequestReport>>(`/reports/requests?${buildQuery({ semesterId })}`).then(r => r.data.data),
  });
}

export function useTrendReport(params: { startSemesterId?: string; endSemesterId?: string } = {}) {
  return useQuery({
    queryKey: ['reports', 'trends', params],
    queryFn: () => apiClient.get<ApiResponse<import('@/types/report').TrendReportItem[]>>(`/reports/trends?${buildQuery(params)}`).then(r => r.data.data),
  });
}
