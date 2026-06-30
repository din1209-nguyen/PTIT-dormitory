'use client';

import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Building2, Layers, DoorOpen, BedDouble, Star, Search, Filter, AlertTriangle } from 'lucide-react';
import { 
  useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding,
  useFloors, useCreateFloor, useUpdateFloor, useDeleteFloor,
  useRooms, useAllRooms, useCreateRoom, useUpdateRoom, useDeleteRoom,
  useBeds, useCreateBed, useUpdateBed, useDeleteBed 
} from '@/features/dormitories/api';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api/apiClient';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { StudentDetailModal } from '@/features/students/components/StudentDetailModal';

import { RoomListTab } from './RoomListTab';

export default function DormitoriesPage() {
  const [activeTab, setActiveTab] = useState<'TREE' | 'LIST'>('TREE');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  const { data: buildings } = useBuildings();
  const { data: allRooms } = useAllRooms();
  const { data: floors } = useFloors(selectedBuilding);
  const { data: rooms } = useRooms(selectedFloor);
  const { data: beds } = useBeds(selectedRoom);
  
  const { data: roomMembers } = useQuery({
    queryKey: ['room-members', selectedRoom],
    queryFn: () => apiClient.get(`/room-assignments/rooms/${selectedRoom}/members`).then(r => r.data.data),
    enabled: !!selectedRoom
  });
  
  const globalStats = useMemo(() => {
    if (!buildings) return { b: 0, f: 0, r: 0, beds: 0, activeRooms: 0 };
    const stats = buildings.reduce((acc: any, b: any) => {
      acc.b += 1;
      acc.f += b.stats?.floorCount || 0;
      acc.r += b.stats?.roomCount || 0;
      acc.beds += b.stats?.bedCount || 0;
      return acc;
    }, { b: 0, f: 0, r: 0, beds: 0, activeRooms: 0 });
    stats.activeRooms = allRooms?.filter((room: any) => (room.stats?.currentResidentCount || 0) > 0).length || 0;
    return stats;
  }, [buildings, allRooms]);

  const { data: modalBeds } = useQuery({
    queryKey: ['beds', modal?.data?._id],
    queryFn: () => apiClient.get(`/beds?roomId=${modal?.data?._id}`).then(r => r.data.data),
    enabled: modal?.type === 'editRoom' && !!modal?.data?._id,
  });
  const isRoomOccupied = (modalBeds as any[])?.some((b: any) => b.status === 'OCCUPIED');

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    return rooms.filter((r: any) => {
      return r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase());
    });
  }, [rooms, roomSearchQuery]);

  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const deleteBuilding = useDeleteBuilding();
  
  const createFloor = useCreateFloor();
  const updateFloor = useUpdateFloor();
  const deleteFloor = useDeleteFloor();

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const createBed = useCreateBed();
  const updateBed = useUpdateBed();
  const deleteBed = useDeleteBed();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    fd.forEach((v, k) => { 
      if (v && v !== 'NO_CHANGE') {
        body[k] = k === 'capacity' || k === 'floorNumber' ? Number(v) : k === 'isFreshmanPriority' ? v === 'true' : v; 
      }
    });

    const t = modal?.type;
    const id = modal?.data?._id as string;
    try {
      if (t === 'createBuilding') await createBuilding.mutateAsync(body);
      else if (t === 'editBuilding') await updateBuilding.mutateAsync({ id, data: body });
      else if (t === 'createFloor') await createFloor.mutateAsync({ ...body, buildingId: selectedBuilding });
      else if (t === 'editFloor') await updateFloor.mutateAsync({ id, data: body });
      else if (t === 'createRoom') await createRoom.mutateAsync({ ...body, floorId: selectedFloor } as any);
      else if (t === 'editRoom') await updateRoom.mutateAsync({ id, data: body });
      else if (t === 'editBed') await updateBed.mutateAsync({ id, data: { status: body.status as string } });
      setModal(null);
      toast.success('Thao tác thành công');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'building') {
        await deleteBuilding.mutateAsync(deleteConfirm.id);
        if (selectedBuilding === deleteConfirm.id) setSelectedBuilding('');
      }
      if (deleteConfirm.type === 'floor') {
        await deleteFloor.mutateAsync(deleteConfirm.id);
        if (selectedFloor === deleteConfirm.id) setSelectedFloor('');
      }
      if (deleteConfirm.type === 'room') {
        await deleteRoom.mutateAsync(deleteConfirm.id);
        if (selectedRoom === deleteConfirm.id) setSelectedRoom('');
      }
      if (deleteConfirm.type === 'bed') {
        await deleteBed.mutateAsync(deleteConfirm.id);
      }
      setDeleteConfirm(null);
      toast.success('Xóa thành công');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  }

  async function handleCreateBed() {
    if (!selectedRoom) return;
    try {
      await createBed.mutateAsync(selectedRoom);
      toast.success('Đã thêm giường mới');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm giường');
    }
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-80px)]">
      <Card className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-max rounded-[var(--radius-md)] bg-bg-page p-1">
            <button onClick={() => setActiveTab('TREE')} className={`px-4 py-2 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${activeTab === 'TREE' ? 'bg-bg-card shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              Sơ đồ khu
            </button>
            <button onClick={() => setActiveTab('LIST')} className={`px-4 py-2 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${activeTab === 'LIST' ? 'bg-bg-card shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
              Danh sách phòng
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:min-w-[900px]">
            <StatPill label="Dãy nhà" value={globalStats.b} />
            <StatPill label="Tầng" value={globalStats.f} />
            <StatPill label="Phòng" value={globalStats.r} />
            <StatPill label="Giường" value={globalStats.beds} />
            <StatPill label="Phòng được sử dụng" value={globalStats.activeRooms} />
          </div>
        </div>
      </Card>

      {activeTab === 'LIST' ? <RoomListTab /> : (
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-4">
        {/* Buildings */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Building2 size={16} className="text-blue-500" /> Dãy nhà ({buildings?.length || 0})
            </h2>
            <button onClick={() => setModal({ type: 'createBuilding' })} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"><Plus size={16} /></button>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            {buildings?.map(b => (
              <div key={b._id} onClick={() => { setSelectedBuilding(b._id); setSelectedFloor(''); setSelectedRoom(''); }}
                className={`flex cursor-pointer items-start justify-between rounded-[var(--radius-sm)] border px-3 py-2 transition-colors ${selectedBuilding === b._id ? 'border-primary bg-primary/10' : 'border-border bg-bg-card hover:bg-bg-page'}`}>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-sm font-medium ${b.status === 'ACTIVE' ? 'text-text-primary' : 'text-status-inactive-text'}`}>Dãy {b.name}</span>
                  <div className="text-[11px] text-text-muted flex gap-2">
                    <span>Tầng: {b.stats?.floorCount || 0}</span>
                    <span>Phòng: {b.stats?.roomCount || 0}</span>
                  </div>
                  <div className={`text-[11px] ${b.status === 'ACTIVE' ? 'text-status-success-text' : 'text-status-inactive-text'}`}>
                    Hoạt động: {b.stats?.activeBedCount || 0}/{b.stats?.bedCount || 0} giường
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(ev) => { ev.stopPropagation(); setModal({ type: 'editBuilding', data: b }); }} className="p-1 text-text-secondary hover:text-primary"><Edit2 size={14} /></button>
                  <button onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm({ type: 'building', id: b._id, name: `Dãy ${b.name}` }); }} className="p-1 text-text-secondary hover:text-status-error-text"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Floors */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Layers size={16} className="text-purple-500" /> Tầng ({floors?.length || 0})
            </h2>
            {selectedBuilding && <button onClick={() => setModal({ type: 'createFloor' })} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"><Plus size={16} /></button>}
          </div>
          {!selectedBuilding ? <p className="text-xs text-text-secondary">Chọn dãy nhà</p> : (
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {floors?.map(f => (
                <div key={f._id} onClick={() => { setSelectedFloor(f._id); setSelectedRoom(''); }}
                  className={`flex cursor-pointer items-start justify-between rounded-[var(--radius-sm)] border px-3 py-2 transition-colors ${selectedFloor === f._id ? 'border-primary bg-primary/10' : 'border-border bg-bg-card hover:bg-bg-page'}`}>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-sm font-medium ${f.status === 'ACTIVE' ? 'text-text-primary' : 'text-status-inactive-text'}`}>Tầng {f.floorNumber}</span>
                    <div className="text-[11px] text-text-muted flex gap-2">
                      <span>Phòng: {f.stats?.roomCount || 0}</span>
                    </div>
                    <div className={`text-[11px] ${f.status === 'ACTIVE' ? 'text-status-success-text' : 'text-status-inactive-text'}`}>
                      Hoạt động: {f.stats?.activeBedCount || 0}/{f.stats?.bedCount || 0} giường
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(ev) => { ev.stopPropagation(); setModal({ type: 'editFloor', data: f }); }} className="p-1 text-text-secondary hover:text-primary"><Edit2 size={14} /></button>
                    <button onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm({ type: 'floor', id: f._id, name: `Tầng ${f.floorNumber}` }); }} className="p-1 text-text-secondary hover:text-status-error-text"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Rooms */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <DoorOpen size={16} className="text-orange-500" /> Phòng ({rooms?.length || 0})
            </h2>
            {selectedFloor && <button onClick={() => setModal({ type: 'createRoom' })} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"><Plus size={16} /></button>}
          </div>
          {!selectedFloor ? <p className="text-xs text-text-secondary">Chọn tầng</p> : (
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredRooms?.length === 0 && <p className="text-xs text-text-secondary text-center py-4">Không tìm thấy phòng phù hợp</p>}
                {filteredRooms?.map((r: any) => (
                  <div key={r._id} onClick={() => setSelectedRoom(r._id)}
                    className={`flex cursor-pointer items-start justify-between rounded-[var(--radius-sm)] border px-3 py-2 transition-colors ${selectedRoom === r._id ? 'border-primary bg-primary/10' : 'border-border bg-bg-card hover:bg-bg-page'}`}>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${r.status === 'ACTIVE' ? 'text-text-primary' : 'text-status-inactive-text'}`}>Phòng {r.roomNumber}</span>
                        {r.isFreshmanPriority && (
                          <span title="Ưu tiên Tân SV">
                            <Star size={12} className="text-status-warning-text fill-current" />
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] ${r.status === 'ACTIVE' ? 'text-status-success-text' : 'text-status-inactive-text'}`}>
                        Hoạt động: {r.stats?.activeBedCount || 0}/{r.stats?.bedCount || 0} giường
                      </div>
                      <div className="mt-1">
                        <Badge value={r.genderType} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(ev) => { ev.stopPropagation(); setModal({ type: 'editRoom', data: r }); }} className="p-1 text-text-secondary hover:text-primary"><Edit2 size={14} /></button>
                      <button onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm({ type: 'room', id: r._id, name: `Phòng ${r.roomNumber}` }); }} className="p-1 text-text-secondary hover:text-status-error-text"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Beds */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BedDouble size={16} className="text-emerald-500" /> Giường ({beds?.length || 0})
            </h2>
            {selectedRoom && (
              <button
                onClick={handleCreateBed}
                disabled={createBed.isPending}
                className="text-primary hover:bg-primary/10 p-1 rounded transition-colors disabled:opacity-50"
                title="Thêm giường"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          {!selectedRoom ? <p className="text-xs text-text-secondary">Chọn phòng</p> : (
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {beds?.map(b => {
                const member = (roomMembers as any[])?.find((m: any) => m.roomSnapshot?.bedNumber === b.bedNumber);
                const isOccupied = b.status === 'OCCUPIED';
                
                return (
                  <div key={b._id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-card px-3 py-2 text-sm hover:bg-bg-page">
                    <div className="min-w-0 flex flex-1 items-center gap-2">
                      <span className="shrink-0 font-medium text-text-primary">{b.bedNumber}</span>
                      {isOccupied && member && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(member.studentId)}
                          title={member.studentId?.fullName || ''}
                          className="min-w-0 truncate text-left font-medium text-primary hover:underline"
                        >
                          {member.studentId?.fullName || 'Sinh viên'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value={b.status} />
                      <button onClick={() => setModal({ type: 'editBed', data: b })} className="p-1 text-text-secondary hover:text-primary" title="Sửa trạng thái"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteConfirm({ type: 'bed', id: b._id, name: `Giường ${b.bedNumber}` })} className="p-1 text-text-secondary hover:text-status-error-text"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      )}

      {/* Modals */}
      <Modal open={modal?.type === 'createBuilding' || modal?.type === 'editBuilding'} onClose={() => setModal(null)} title={modal?.type === 'editBuilding' ? 'Sửa dãy nhà' : 'Thêm dãy nhà'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Tên dãy" name="name" defaultValue={modal?.data?.name as string} required />
          <Input label="Mô tả" name="description" defaultValue={modal?.data?.description as string} />
          <div className="flex flex-col gap-1">
            <Select label="Trạng thái hoạt động" name="status" options={[{value:'ACTIVE',label:'Đang hoạt động'},{value:'MAINTENANCE',label:'Bảo trì'},{value:'INACTIVE',label:'Ngừng hoạt động'}]} defaultValue={modal?.data?.status || 'ACTIVE'} />
          </div>
          {modal?.type === 'editBuilding' && (
            <div className="flex flex-col gap-4 p-4 rounded border border-border mt-2">
              <p className="text-[11px] text-text-muted">Ngừng hoạt động sẽ áp dụng cho tất cả Tầng/Phòng bên trong.</p>
              <div className="flex flex-col gap-1">
                <Select label="Đổi giới tính tất cả phòng (Tùy chọn)" name="genderType" options={[{value:'NO_CHANGE',label:'Không thay đổi'},{value:'MALE',label:'Đổi thành Nam'},{value:'FEMALE',label:'Đổi thành Nữ'}]} defaultValue="NO_CHANGE" />
                <p className="text-[11px] text-status-warning-text flex gap-1 items-start"><AlertTriangle size={12} className="shrink-0 mt-0.5" /> Nếu có sinh viên trái giới tính đang ở, hệ thống sẽ chặn thao tác này.</p>
              </div>
              <div className="flex flex-col gap-1">
                <Select label="Đổi ưu tiên Tân SV (Tùy chọn)" name="isFreshmanPriority" options={[{value:'NO_CHANGE',label:'Không thay đổi'},{value:'true',label:'Bật ưu tiên cho tất cả'},{value:'false',label:'Tắt ưu tiên cho tất cả'}]} defaultValue="NO_CHANGE" />
              </div>
            </div>
          )}
          <Button type="submit" className="mt-2">{modal?.type === 'editBuilding' ? 'Cập nhật' : 'Thêm'}</Button>
        </form>
      </Modal>

      <Modal open={modal?.type === 'createFloor' || modal?.type === 'editFloor'} onClose={() => setModal(null)} title={modal?.type === 'editFloor' ? 'Sửa tầng' : 'Thêm tầng'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Số tầng" name="floorNumber" type="number" defaultValue={modal?.data?.floorNumber as number} required />
          <Input label="Mô tả" name="description" defaultValue={modal?.data?.description as string} />
          <div className="flex flex-col gap-1">
            <Select label="Trạng thái tầng" name="status" options={[{value:'ACTIVE',label:'Đang hoạt động'},{value:'MAINTENANCE',label:'Bảo trì'},{value:'INACTIVE',label:'Ngừng hoạt động'}]} defaultValue={modal?.data?.status || 'ACTIVE'} />
          </div>
          {modal?.type === 'editFloor' && (
            <div className="flex flex-col gap-4 p-4 rounded border border-border mt-2">
              <p className="text-[11px] text-text-muted">Ngừng hoạt động sẽ áp dụng cho tất cả Phòng bên trong.</p>
              <div className="flex flex-col gap-1">
                <Select label="Đổi giới tính tất cả phòng (Tùy chọn)" name="genderType" options={[{value:'NO_CHANGE',label:'Không thay đổi'},{value:'MALE',label:'Đổi thành Nam'},{value:'FEMALE',label:'Đổi thành Nữ'}]} defaultValue="NO_CHANGE" />
                <p className="text-[11px] text-status-warning-text flex gap-1 items-start"><AlertTriangle size={12} className="shrink-0 mt-0.5" /> Nếu có sinh viên trái giới tính đang ở, hệ thống sẽ chặn thao tác này.</p>
              </div>
              <div className="flex flex-col gap-1">
                <Select label="Đổi ưu tiên Tân SV (Tùy chọn)" name="isFreshmanPriority" options={[{value:'NO_CHANGE',label:'Không thay đổi'},{value:'true',label:'Bật ưu tiên cho tất cả'},{value:'false',label:'Tắt ưu tiên cho tất cả'}]} defaultValue="NO_CHANGE" />
              </div>
            </div>
          )}
          <Button type="submit" className="mt-2">{modal?.type === 'editFloor' ? 'Cập nhật' : 'Thêm'}</Button>
        </form>
      </Modal>

      <Modal open={modal?.type === 'createRoom' || modal?.type === 'editRoom'} onClose={() => setModal(null)} title={modal?.type === 'editRoom' ? 'Sửa phòng' : 'Thêm phòng'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Số phòng" name="roomNumber" defaultValue={modal?.data?.roomNumber as string} required />
          <Input label="Sức chứa" name="capacity" type="number" defaultValue={modal?.data?.capacity as number || 8} required />
          <Select label="Giới tính" name="genderType" options={[{value:'MALE',label:'Nam'},{value:'FEMALE',label:'Nữ'}]} defaultValue={modal?.data?.genderType as string} />
          {modal?.type === 'editRoom' && isRoomOccupied ? (
            <div className="p-3 bg-status-inactive-bg text-status-inactive-text rounded border border-border text-sm">
              Phòng đang có sinh viên. Không thể đổi trạng thái.
              <input type="hidden" name="status" value={modal?.data?.status as string} />
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-3 bg-bg-page rounded border border-border mt-2">
              <Select label="Trạng thái" name="status" options={[{value:'ACTIVE',label:'Hoạt động'},{value:'MAINTENANCE',label:'Bảo trì'},{value:'INACTIVE',label:'Ngừng'}]} defaultValue={modal?.data?.status as string || 'ACTIVE'} />
              <p className="text-[11px] text-text-muted flex gap-1 items-start"><AlertTriangle size={12} className="shrink-0 mt-0.5" /> Trạng thái này sẽ áp dụng cho tất cả giường trong phòng.</p>
            </div>
          )}
          <Select label="Ưu tiên tân SV" name="isFreshmanPriority" options={[{value:'false',label:'Không'},{value:'true',label:'Có'}]} defaultValue={String(modal?.data?.isFreshmanPriority || false)} />
          <Button type="submit" className="mt-2">{modal?.type === 'editRoom' ? 'Cập nhật' : 'Thêm'}</Button>
        </form>
      </Modal>

      <Modal open={modal?.type === 'editBed'} onClose={() => setModal(null)} title="Đổi trạng thái giường">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">Giường: {modal?.data?.bedNumber as string}</p>
          {modal?.data?.status === 'OCCUPIED' ? (
            <div className="p-3 bg-status-inactive-bg text-status-inactive-text rounded border border-border text-sm">
              Giường đang có sinh viên ở. Không thể đổi trạng thái thủ công.
            </div>
          ) : (
            <>
              <Select 
                label="Trạng thái" 
                name="status" 
                options={[{value:'AVAILABLE',label:'Trống'},{value:'MAINTENANCE',label:'Bảo trì'},{value:'BROKEN',label:'Hỏng'}]} 
                defaultValue={modal?.data?.status as string} 
              />
              <Button type="submit" className="mt-2">Cập nhật</Button>
            </>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Xác nhận xóa">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Bạn có chắc chắn muốn xóa <strong>{deleteConfirm?.name}</strong> không?
          </p>
          <div className="p-3 bg-status-error-bg/10 text-status-error-text border border-status-error-border rounded text-sm flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>
              Hành động này không thể hoàn tác và sẽ <strong>xóa toàn bộ dữ liệu con</strong> bên trong (nếu có). Chỉ có thể xóa nếu không có sinh viên nào đang ở.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button type="button" variant="danger" onClick={handleDelete}>Xóa</Button>
          </div>
        </div>
      </Modal>

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-bg-page px-4 py-3">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}
