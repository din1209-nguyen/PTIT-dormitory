import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Student } from '@/types/student';
import type { PaginatedResponse, ApiResponse } from '@/types/api';

interface StudentParams {
  page?: number; limit?: number; keyword?: string;
  gender?: string; department?: string; residenceType?: string; academicYear?: string;
  isFreshman?: boolean;
}

export function useStudents(params: StudentParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') query.set(k, String(v)); });
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => apiClient.get<PaginatedResponse<Student>>(`/students?${query}`).then(r => r.data.data),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => apiClient.get<ApiResponse<Student>>(`/students/${id}`).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: ['students', 'stats'],
    queryFn: () => apiClient.get<ApiResponse<{ total: number; residing: number; pending: number; inactive: number }>>('/students/stats').then(r => r.data.data),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Student>) => apiClient.post('/students', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => apiClient.put(`/students/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useAddToWaitingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: string | { id: string, semesterId?: string }) => {
      const id = typeof data === 'string' ? data : data.id;
      const semesterId = typeof data === 'string' ? undefined : data.semesterId;
      return apiClient.post(`/students/${id}/add-to-waiting-list`, semesterId ? { semesterId } : {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}
