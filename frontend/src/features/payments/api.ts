import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Payment } from '@/types/utilityBilling';
import type { ApiResponse } from '@/types/api';

export function useCreateVnpayPayment() {
  return useMutation({
    mutationFn: (data: { billId: string }) =>
      apiClient.post<ApiResponse<{ paymentUrl: string; paymentId: string }>>('/payments/vnpay/create', data).then(r => r.data.data),
  });
}

export function usePaymentStatus(txnRef: string | null) {
  return useQuery({
    queryKey: ['payment-status', txnRef],
    queryFn: () => apiClient.get<ApiResponse<Payment>>(`/payments/status?txnRef=${txnRef}`).then(r => r.data.data),
    enabled: !!txnRef,
  });
}

export function useCashConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { billId: string; studentId: string }) => apiClient.post('/payments/cash-confirm', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utility-bills'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useBillPayments(billId: string | null) {
  return useQuery({
    queryKey: ['payments', 'bill', billId],
    queryFn: () => apiClient.get<ApiResponse<Payment[]>>(`/payments/bill/${billId}`).then(r => r.data.data),
    enabled: !!billId,
  });
}
