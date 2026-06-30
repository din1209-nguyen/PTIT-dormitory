import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { RoomAssignment } from '@/types/roomAssignment';
import type { Student } from '@/types/student';
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

// Lấy danh sách sinh viên đã được xếp phòng theo học kỳ
export function useRoomAssignmentsBySemester(semesterId: string) {
  return useQuery({
    queryKey: ['room-assignments', 'semester', semesterId],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/semester/${semesterId}`).then(r => r.data.data),
    enabled: !!semesterId,
  });
}

// Tạo chuỗi query cho bộ lọc lịch sử cư trú
function buildHistoryQuery(params: AssignmentHistoryParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query;
}

// Lấy lịch sử cư trú theo học kỳ và bộ lọc
export function useHistoryBySemester(semesterId: string, params: AssignmentHistoryParams = {}) {
  const query = buildHistoryQuery(params);
  return useQuery({
    queryKey: ['room-assignments', 'history', 'semester', semesterId, params],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/history/semester/${semesterId}?${query}`).then(r => r.data.data),
    enabled: !!semesterId,
  });
}

// Tải file Excel lịch sử cư trú theo học kỳ
export async function downloadHistoryBySemesterExcel(semesterId: string, params: AssignmentHistoryParams = {}) {
  const query = buildHistoryQuery(params);
  const response = await apiClient.get(`/room-assignments/history/semester/${semesterId}/export-excel?${query}`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}

// Lấy danh sách phân phòng của một sinh viên
export function useRoomAssignmentsByStudent(studentId: string) {
  return useQuery({
    queryKey: ['room-assignments', 'student', studentId],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/student/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  });
}

// Lấy danh sách sinh viên chưa được xếp phòng trong học kỳ
export function useUnassignedStudents(semesterId: string) {
  return useQuery({
    queryKey: ['room-assignments', 'semester', semesterId, 'unassigned'],
    queryFn: () => apiClient.get<ApiResponse<Student[]>>(`/room-assignments/semester/${semesterId}/unassigned`).then(r => r.data.data),
    enabled: !!semesterId,
  });
}

// Tự động xếp phòng và làm mới cache xếp phòng
export function useAutoAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { semesterId: string; excludeStudentIds?: string[] }) => apiClient.post('/room-assignments/auto', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-assignments'] });
    },
  });
}

// Xếp phòng thủ công cho sinh viên
export function useManualAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentId: string; roomId: string; bedId: string; semesterId: string }) =>
      apiClient.post('/room-assignments/manual', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-assignments'] }),
  });
}
// Hủy xếp phòng hiện tại của sinh viên
export function useUnassignRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/room-assignments/${id}/unassign`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-assignments'] }),
  });
}

// Chuyển sinh viên sang phòng và giường khác
export function useTransferRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { newRoomId: string; newBedId: string } }) =>
      apiClient.put(`/room-assignments/${id}/transfer`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['room-assignments'] }),
  });
}

// Loại sinh viên chưa xếp phòng khỏi danh sách chờ
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
