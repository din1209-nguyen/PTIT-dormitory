import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { UtilityUsage, UtilityBill, UtilityBillMember, ElectricPriceTier } from '@/types/utilityBilling';
import type { PaginatedResponse, ApiResponse } from '@/types/api';

export function useUtilityUsages(params: { page?: number; limit?: number; month?: number; year?: number; buildingId?: string; roomId?: string; sortBy?: string; sortOrder?: string } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
  return useQuery({
    queryKey: ['utility-usages', params],
    queryFn: () => apiClient.get<PaginatedResponse<UtilityUsage>>(`/utility-usages?${q}`).then(r => r.data.data),
  });
}

export function useCreateUtilityUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/utility-usages', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['utility-usages'] }),
  });
}

export function useUtilityBills(params: { page?: number; limit?: number; month?: number; year?: number; status?: string; buildingId?: string } = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.set(k, String(v)); });
  return useQuery({
    queryKey: ['utility-bills', params],
    queryFn: () => apiClient.get<PaginatedResponse<UtilityBill>>(`/utility-bills?${q}`).then(r => r.data.data),
  });
}

export function useUtilityBill(id: string | null) {
  return useQuery({
    queryKey: ['utility-bills', id],
    queryFn: () => apiClient.get<ApiResponse<UtilityBill>>(`/utility-bills/${id}`).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useMyBills() {
  return useQuery({
    queryKey: ['utility-bills', 'me'],
    queryFn: () => apiClient.get<ApiResponse<UtilityBillMember[]>>('/utility-bills/me').then(r => r.data.data),
  });
}

export function useGenerateBills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: number; year: number }) => apiClient.post('/utility-bills/generate', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['utility-bills'] }),
  });
}

export function useMarkOverdue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/utility-bills/${id}/mark-overdue`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['utility-bills'] }),
  });
}

export function useCancelBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/utility-bills/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['utility-bills'] }),
  });
}

export function useElectricPriceTiers() {
  return useQuery({
    queryKey: ['electric-price-tiers'],
    queryFn: () => apiClient.get<ApiResponse<ElectricPriceTier[]>>('/electric-price-tiers').then(r => r.data.data),
  });
}

export function useCreateElectricPriceTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/electric-price-tiers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['electric-price-tiers'] }),
  });
}

export function useUpdateElectricPriceTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.put(`/electric-price-tiers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['electric-price-tiers'] }),
  });
}

export function useBulkUpdateElectricPriceTiers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any[]) => apiClient.put('/electric-price-tiers/bulk', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['electric-price-tiers'] }),
  });
}
