import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/apiClient';
import type { Building, Floor, Room, Bed, PopulatedRoom, RoomListFilters } from '@/types/dormitory';
import type { ApiResponse } from '@/types/api';

// Lấy danh sách tòa nhà kèm thống kê tổng quan
export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: () => apiClient.get<ApiResponse<Building[]>>('/buildings').then(r => r.data.data),
  });
}
// Tạo tòa nhà mới
export function useCreateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Building>) => apiClient.post('/buildings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buildings'] }),
  });
}
// Cập nhật tòa nhà và làm mới dữ liệu phụ thuộc
export function useUpdateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Building> }) => apiClient.put(`/buildings/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      qc.invalidateQueries({ queryKey: ['floors'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['all-rooms'] });
    },
  });
}
// Xóa tòa nhà khi backend cho phép
export function useDeleteBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/buildings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buildings'] }),
  });
}

// Lấy danh sách tầng theo tòa nhà
export function useFloors(buildingId: string) {
  return useQuery({
    queryKey: ['floors', buildingId],
    queryFn: () => apiClient.get<ApiResponse<Floor[]>>(`/floors?buildingId=${buildingId}`).then(r => r.data.data),
    enabled: !!buildingId,
  });
}
// Tạo tầng mới
export function useCreateFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Floor>) => apiClient.post('/floors', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floors'] }),
  });
}
// Cập nhật tầng và làm mới phòng giường liên quan
export function useUpdateFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Floor> }) => apiClient.put(`/floors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floors'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['all-rooms'] });
    },
  });
}
// Xóa tầng khi không còn dữ liệu chặn
export function useDeleteFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/floors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floors'] }),
  });
}

// Lấy danh sách phòng theo tầng
export function useRooms(floorId: string) {
  return useQuery({
    queryKey: ['rooms', floorId],
    queryFn: () => apiClient.get<ApiResponse<Room[]>>(`/rooms?floorId=${floorId}`).then(r => r.data.data),
    enabled: !!floorId,
  });
}

// Lấy toàn bộ phòng đã populate tầng và tòa nhà
export function useAllRooms() {
  return useQuery({
    queryKey: ['all-rooms'],
    queryFn: () => apiClient.get<ApiResponse<PopulatedRoom[]>>('/rooms?populate=true').then(r => r.data.data),
  });
}

// Lấy danh sách phòng theo bộ lọc quản lý
export function useRoomsList(filters: RoomListFilters) {
  return useQuery({
    queryKey: ['rooms-list', filters],
    queryFn: () => {
      const params = new URLSearchParams({ populate: 'true' });
      if (filters.status && filters.status !== 'ALL' && filters.status !== 'USED') params.append('status', filters.status);
      if (filters.genderType && filters.genderType !== 'ALL') params.append('genderType', filters.genderType);
      if (filters.buildingId) params.append('buildingId', filters.buildingId);
      if (filters.floorId) params.append('floorId', filters.floorId);
      return apiClient.get<ApiResponse<PopulatedRoom[]>>(`/rooms?${params.toString()}`).then(r => r.data.data);
    },
  });
}
// Tạo phòng mới và sinh giường tương ứng phía backend
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Room> & { capacity: number; floorId: string }) => apiClient.post('/rooms', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}
// Cập nhật thông tin phòng
export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Room> }) => apiClient.put(`/rooms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['all-rooms'] });
    },
  });
}
// Xóa phòng khi không có sinh viên đang ở
export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['all-rooms'] });
    },
  });
}

// Lấy danh sách giường theo phòng
export function useBeds(roomId: string) {
  return useQuery({
    queryKey: ['beds', roomId],
    queryFn: () => apiClient.get<ApiResponse<Bed[]>>(`/beds?roomId=${roomId}`).then(r => r.data.data),
    enabled: !!roomId,
  });
}
// Tạo thêm giường cho phòng
export function useCreateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => apiClient.post('/beds', { roomId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      qc.invalidateQueries({ queryKey: ['floors'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['all-rooms'] });
      qc.invalidateQueries({ queryKey: ['rooms-list'] });
    },
  });
}
// Cập nhật trạng thái giường
export function useUpdateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) => apiClient.put(`/beds/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beds'] }),
  });
}
// Xóa giường khi backend cho phép
export function useDeleteBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/beds/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beds'] }),
  });
}

// Lấy danh sách khoa/ngành cấu hình
export function useFaculties() {
  return useQuery({
    queryKey: ['faculties'],
    queryFn: () => apiClient.get<ApiResponse<string[]>>('/configs/faculties').then(r => r.data.data),
  });
}
