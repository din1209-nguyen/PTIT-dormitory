import { useState, useMemo } from 'react';
import { useRoomsList, useBuildings, useFloors } from '@/features/dormitories/api';
import apiClient from '@/lib/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { Search } from 'lucide-react';
import { TableSkeleton } from '@/components/common/Skeleton';
import { Pagination } from '@/components/common/Pagination';
import { StudentDetailModal } from '@/features/students/components/StudentDetailModal';

export function RoomListTab() {
  const [filters, setFilters] = useState({
    buildingId: '',
    floorId: '',
    status: 'ALL',
    genderType: 'ALL',
    isFreshmanPriority: false
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: buildings } = useBuildings();
  const { data: floors } = useFloors(filters.buildingId);
  const { data: rooms, isLoading } = useRoomsList(filters);

  const { data: roomMembers } = useQuery({
    queryKey: ['room-members', selectedRoom?._id],
    queryFn: () => apiClient.get(`/room-assignments/rooms/${selectedRoom?._id}/members`).then(r => r.data.data),
    enabled: !!selectedRoom?._id
  });

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    const q = search.toLowerCase();
    return rooms.filter((r: any) => {
      const matchesSearch = r.roomNumber.toLowerCase().includes(q);
      const matchesUsed = filters.status !== 'USED' || (r.stats?.currentResidentCount || 0) > 0;
      const matchesFreshman = !filters.isFreshmanPriority || r.isFreshmanPriority === true;
      return matchesSearch && matchesUsed && matchesFreshman;
    });
  }, [rooms, search, filters.status, filters.isFreshmanPriority]);

  const paginatedRooms = useMemo(() => {
    return filteredRooms.slice((page - 1) * 20, page * 20);
  }, [filteredRooms, page]);

  const totalPages = Math.ceil(filteredRooms.length / 20);

  const buildingOptions = [{ value: '', label: 'Tất cả dãy nhà' }].concat(
    (buildings || []).map((b: any) => ({ value: b._id, label: `Dãy ${b.name}` }))
  );

  const floorOptions = [{ value: '', label: 'Tất cả tầng' }].concat(
    (floors || []).map((f: any) => ({ value: f._id, label: `Tầng ${f.floorNumber}` }))
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-text-secondary mb-1 block">Tìm phòng</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Nhập số phòng..."
              className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-page py-1.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Khu/Dãy"
            value={filters.buildingId}
            onChange={(e) => { setFilters(f => ({ ...f, buildingId: e.target.value, floorId: '' })); setPage(1); }}
            options={buildingOptions}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Tầng"
            value={filters.floorId}
            onChange={(e) => { setFilters(f => ({ ...f, floorId: e.target.value })); setPage(1); }}
            options={floorOptions}
            disabled={!filters.buildingId}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Giới tính"
            value={filters.genderType}
            onChange={(e) => { setFilters(f => ({ ...f, genderType: e.target.value })); setPage(1); }}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'MALE', label: 'Nam' },
              { value: 'FEMALE', label: 'Nữ' },
              { value: 'ANY', label: 'Hỗn hợp' }
            ]}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Trạng thái"
            value={filters.status}
            onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            options={[
              { value: 'ALL', label: 'Tất cả' },
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'USED', label: 'Phòng được sử dụng' },
              { value: 'MAINTENANCE', label: 'Bảo trì' },
              { value: 'INACTIVE', label: 'Ngừng HĐ' }
            ]}
          />
        </div>
        <div className="w-full sm:w-max flex items-end pb-1">
          <label className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-page px-4 text-sm font-medium text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isFreshmanPriority}
              onChange={e => { setFilters(f => ({ ...f, isFreshmanPriority: e.target.checked })); setPage(1); }}
              className="h-4 w-4 accent-primary cursor-pointer"
            />
            Tân sinh viên
          </label>
        </div>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <div className="overflow-x-auto h-[calc(100vh-280px)] overflow-y-auto">
          {isLoading ? <div className="p-4"><TableSkeleton columns={6} rows={5} /></div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary bg-bg-page/50">
                  <th className="py-3 px-4 font-medium">Số phòng</th>
                  <th className="py-3 px-4 font-medium">Vị trí</th>
                  <th className="py-3 px-4 font-medium">Sức chứa</th>
                  <th className="py-3 px-4 font-medium">Giới tính</th>
                  <th className="py-3 px-4 font-medium">Tân SV</th>
                  <th className="py-3 px-4 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((r: any) => {
                  const hasStudents = (r.stats?.currentResidentCount || 0) > 0;
                  return (
                    <tr
                      key={r._id}
                      onClick={() => setSelectedRoom(r)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${hasStudents ? 'bg-primary/5 hover:bg-primary/10 border-l-[3px] border-l-primary' : 'hover:bg-bg-page'}`}
                    >
                      <td className={`py-3 px-4 font-bold ${hasStudents ? 'text-primary' : 'text-text-primary'}`}>
                        {r.roomNumber}
                      </td>
                      <td className="py-3 px-4">
                        {r.floorId?.buildingId?.name ? `Dãy ${r.floorId.buildingId.name}` : ''} -
                        {r.floorId?.floorNumber ? ` Tầng ${r.floorId.floorNumber}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-primary font-medium">{r.stats?.currentResidentCount || 0}</span>
                        <span className="text-text-muted"> / {r.capacity}</span>
                      </td>
                      <td className="py-3 px-4"><Badge value={r.genderType} /></td>
                      <td className="py-3 px-4">{r.isFreshmanPriority ? 'Có' : 'Không'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge value={r.status} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary">Không tìm thấy phòng phù hợp</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="border-t border-border bg-bg-secondary p-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Modal Chi tiết Phòng */}
      <Modal open={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={`Chi tiết phòng ${selectedRoom?.roomNumber || ''}`} size="3xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-bg-page rounded-[var(--radius-md)]">
            <div>
              <span className="block text-xs text-text-secondary mb-1">Vị trí</span>
              <span className="font-medium text-text-primary">
                {selectedRoom?.floorId?.buildingId?.name ? `Dãy ${selectedRoom.floorId.buildingId.name}` : ''} - Tầng {selectedRoom?.floorId?.floorNumber}
              </span>
            </div>
            <div>
              <span className="block text-xs text-text-secondary mb-1">Giới tính</span>
              <Badge value={selectedRoom?.genderType || 'ANY'} />
            </div>
            <div>
              <span className="block text-xs text-text-secondary mb-1">Đã ở</span>
              <span className="font-medium text-text-primary">{selectedRoom?.stats?.currentResidentCount || 0} / {selectedRoom?.capacity}</span>
            </div>
            <div>
              <span className="block text-xs text-text-secondary mb-1">Trạng thái</span>
              <Badge value={selectedRoom?.status || 'ACTIVE'} />
            </div>
          </div>

          <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-page border-b border-border text-text-secondary">
                <tr>
                  <th className="py-2 px-4 text-left font-medium">MSSV</th>
                  <th className="py-2 px-4 text-left font-medium">Họ và tên</th>
                  <th className="py-2 px-4 text-left font-medium">Giường</th>
                  <th className="py-2 px-4 text-left font-medium">Ngày xếp</th>
                </tr>
              </thead>
              <tbody>
                {roomMembers ? ((roomMembers as any[]).length > 0 ? (roomMembers as any[]).map((member: any) => {
                  const student = member.studentId || {};
                  return (
                    <tr
                      key={member._id}
                      onClick={() => setSelectedStudent(student)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-page/50"
                    >
                      <td className="py-3 px-4 font-medium">{student.studentCode || '—'}</td>
                      <td className="py-3 px-4 font-medium text-primary">{student.fullName || '—'}</td>
                      <td className="py-3 px-4 font-medium">{member.roomSnapshot?.bedNumber || member.bedId?.bedNumber || '—'}</td>
                      <td className="py-3 px-4 text-text-secondary">{member.assignedAt ? new Date(member.assignedAt).toLocaleDateString('vi-VN') : '—'}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-secondary">Phòng hiện chưa có sinh viên đang lưu trú</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="py-4 text-center"><div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

