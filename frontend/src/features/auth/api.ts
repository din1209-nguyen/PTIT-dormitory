import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', data),
  });
}
