import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Notification } from '@/types/notification';
import type { ApiResponse } from '@/types/api';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<ApiResponse<Notification[]>>('/notifications').then(r => r.data.data),
  });
}
export function useMyNotifications() {
  return useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => apiClient.get<ApiResponse<Notification[]>>('/notifications/me').then(r => r.data.data),
  });
}
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiClient.get<ApiResponse<{ count: number }>>('/notifications/me/unread-count').then(r => r.data.data),
  });
}
export function useCreateGeneralNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; type?: string }) => apiClient.post('/notifications/general', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
export function useCreatePrivateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; type?: string; studentIds: string[] }) => apiClient.post('/notifications/private', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}
