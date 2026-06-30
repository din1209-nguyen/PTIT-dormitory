import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { RoomAssignment } from '@/types/roomAssignment';
import type { ApiResponse } from '@/types/api';

export interface AssignmentHistoryParams {
  keyword?: string;
  gender?: string;
  department?: string;
  residenceType?: string;
  isFreshman?: boolean;
  building?: string;
  room?: string;
}

export function useRoomAssignmentsBySemester(semesterId: string) {
  return useQuery({
    queryKey: ['roomAssignments', 'semester', semesterId],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/semester/${semesterId}`).then(r => r.data.data),
    enabled: !!semesterId,
  });
}

function buildHistoryQuery(params: AssignmentHistoryParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query;
}

export function useHistoryBySemester(semesterId: string, params: AssignmentHistoryParams = {}) {
  const query = buildHistoryQuery(params);
  return useQuery({
    queryKey: ['roomAssignments', 'history', 'semester', semesterId, params],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/history/semester/${semesterId}?${query}`).then(r => r.data.data),
    enabled: !!semesterId,
  });
}

export async function downloadHistoryBySemesterExcel(semesterId: string, params: AssignmentHistoryParams = {}) {
  const query = buildHistoryQuery(params);
  const response = await apiClient.get(`/room-assignments/history/semester/${semesterId}/export-excel?${query}`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

export function useRoomAssignmentsByStudent(studentId: string) {
  return useQuery({
    queryKey: ['roomAssignments', 'student', studentId],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/student/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  });
}

export function useUnassignedStudents(semesterId: string) {
  return useQuery({
    queryKey: ['room-assignments', 'semester', semesterId, 'unassigned'],
    queryFn: () => apiClient.get<ApiResponse<any[]>>(`/room-assignments/semester/${semesterId}/unassigned`).then(r => r.data.data),
    enabled: !!semesterId,
  });
}

export function useAutoAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { semesterId: string; excludeStudentIds?: string[] }) => apiClient.post('/room-assignments/auto', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roomAssignments'] });
      qc.invalidateQueries({ queryKey: ['room-assignments'] });
    },
  });
}

export function useManualAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentId: string; roomId: string; bedId: string; semesterId: string }) =>
      apiClient.post('/room-assignments/manual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-assignments'] }),
  });
}
export function useUnassignRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/room-assignments/${id}/unassign`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-assignments'] }),
  });
}

export function useTransferRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { newRoomId: string; newBedId: string } }) =>
      apiClient.put(`/room-assignments/${id}/transfer`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-assignments'] }),
  });
}

export function useRemoveUnassignedStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ semesterId, excludeStudentIds }: { semesterId: string; excludeStudentIds?: string[] }) =>
      apiClient.post(`/room-assignments/semester/${semesterId}/unassigned/remove`, { excludeStudentIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-assignments'] });
    },
  });
}
