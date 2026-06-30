'use client';


import { useState, useMemo, useEffect } from 'react';
import { BedDouble, Shuffle, Plus, Users, UserMinus, ArrowRightLeft, Search, Filter, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomAssignmentsBySemester, useUnassignedStudents, useAutoAssign, useManualAssign, useUnassignRoom, useTransferRoom, useRemoveUnassignedStudents } from '@/features/roomAssignments/api';
import { useSemesters } from '@/features/semesters/api';
import { useStudents, useAddToWaitingList } from '@/features/students/api';
import { useBuildings, useFloors, useRooms, useBeds } from '@/features/dormitories/api';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/common/Skeleton';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { Pagination } from '@/components/common/Pagination';
import type { RoomAssignment } from '@/types/roomAssignment';
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'UNOPENED': return 'Chưa mở';
    case 'PREPARING': return 'Chuẩn bị';
    case 'ACTIVE': return 'Hoạt động';
    case 'FINISHED': return 'Đã kết thúc';
    default: return status;
  }
};

export default function RoomAssignmentsPage() {
  const [semesterId, setSemesterId] = useState('');
  const [activeTab, setActiveTab] = useState<'assigned' | 'unassigned'>('assigned');
  const [manualOpen, setManualOpen] = useState(false);
  const [transferAssignment, setTransferAssignment] = useState<RoomAssignment | null>(null);
  const [confirmUnassign, setConfirmUnassign] = useState<string | null>(null);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);
  const [confirmAutoAssign, setConfirmAutoAssign] = useState(false);
  const [studentKeyword, setStudentKeyword] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBed, setSelectedBed] = useState('');
  const [excludedStudentIds, setExcludedStudentIds] = useState<Set<string>>(new Set());
  const [addWaitlistOpen, setAddWaitlistOpen] = useState(false);
  const [selectedWaitlistStudent, setSelectedWaitlistStudent] = useState('');

  const [assignedPage, setAssignedPage] = useState(1);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const itemsPerPage = 20;

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const { data: semesters } = useSemesters({ limit: 50 });
  const { data: assignments, isLoading } = useRoomAssignmentsBySemester(semesterId);
  const { data: unassignedStudents, isLoading: isLoadingUnassigned } = useUnassignedStudents(semesterId);
  const autoMut = useAutoAssign();
  const manualMut = useManualAssign();
  const unassignMut = useUnassignRoom();
  const transferMut = useTransferRoom();
  const removeAllMut = useRemoveUnassignedStudents();
  const waitlistMut = useAddToWaitingList();

  const { data: studentsData, isLoading: studentsLoading } = useStudents({ limit: 50, keyword: studentKeyword || undefined });
  const { data: buildings } = useBuildings();
  const { data: floors } = useFloors(selectedBuilding);
  const { data: rooms } = useRooms(selectedFloor);
  const { data: beds } = useBeds(selectedRoom);

  const selectedSemester = semesters?.items.find(s => s._id === semesterId);
  const canAssign = selectedSemester && ['PREPARING', 'ACTIVE'].includes(selectedSemester.status);

  const activeSemester = semesters?.items.find(s => s.status === 'PREPARING')
    || semesters?.items.find(s => s.status === 'ACTIVE')
    || semesters?.items[0];
  useEffect(() => {
    if (!semesterId && activeSemester) setSemesterId(activeSemester._id);
  }, [activeSemester, semesterId]);

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      const s = typeof a.studentId === 'object' ? a.studentId : null;
      const r = typeof a.roomId === 'object' ? a.roomId : null;
      const q = searchQuery.toLowerCase();
      
      const matchSearch = !q || 
        s?.studentCode?.toLowerCase().includes(q) || 
        s?.fullName?.toLowerCase().includes(q) ||
        r?.roomNumber?.toLowerCase().includes(q);
        
      const matchGender = genderFilter === 'ALL' || s?.gender === genderFilter;
      
      const matchPriority = priorityFilter === 'ALL' || 
        (priorityFilter === 'FRESHMAN' ? (r as any)?.isFreshmanPriority === true : (r as any)?.isFreshmanPriority === false);
      
      return matchSearch && matchGender && matchPriority;
    });
  }, [assignments, searchQuery, genderFilter, priorityFilter]);

  const filteredUnassignedStudents = useMemo(() => {
    if (!unassignedStudents) return [];
    return (unassignedStudents as any[]).filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        s.studentCode?.toLowerCase().includes(q) || 
        s.fullName?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.major?.toLowerCase().includes(q);
        
      const matchGender = genderFilter === 'ALL' || s.gender === genderFilter;
      
      return matchSearch && matchGender;
    });
  }, [unassignedStudents, searchQuery, genderFilter]);

  const grouped = groupByRoom(filteredAssignments);
  const groupedEntries = Object.entries(grouped);

  const paginatedGroupedEntries = useMemo(() => {
    const start = (assignedPage - 1) * itemsPerPage;
    return groupedEntries.slice(start, start + itemsPerPage);
  }, [groupedEntries, assignedPage]);
  const totalAssignedPages = Math.ceil(groupedEntries.length / itemsPerPage);

  const paginatedUnassignedStudents = useMemo(() => {
    const start = (unassignedPage - 1) * itemsPerPage;
    return filteredUnassignedStudents.slice(start, start + itemsPerPage);
  }, [filteredUnassignedStudents, unassignedPage]);
  const totalUnassignedPages = Math.ceil(filteredUnassignedStudents.length / itemsPerPage);

  // Reset pagination on filter change
  useMemo(() => {
    setAssignedPage(1);
    setUnassignedPage(1);
  }, [searchQuery, genderFilter, priorityFilter, semesterId]);

  const studentOptions = useMemo(() =>
    (studentsData?.items || []).map(s => ({ value: s._id, label: s.studentCode, sublabel: s.fullName })),
    [studentsData]
  );
  const buildingOptions = useMemo(() =>
    (buildings || []).map(b => ({ value: b._id, label: b.name })),
    [buildings]
  );
  const floorOptions = useMemo(() =>
    (floors || []).map(f => ({ value: f._id, label: `Tầng ${f.floorNumber}` })),
    [floors]
  );
  const roomOptions = useMemo(() =>
    (rooms || []).map(r => ({ value: r._id, label: r.roomNumber })),
    [rooms]
  );
  const bedOptions = useMemo(() =>
    (beds || []).map(b => ({ value: b._id, label: b.bedNumber, sublabel: b.status === 'AVAILABLE' ? 'Trống' : 'Đã sử dụng' })),
    [beds]
  );

  function resetManualForm() {
    setSelectedStudent(''); setSelectedBuilding(''); setSelectedFloor('');
    setSelectedRoom(''); setSelectedBed(''); setStudentKeyword('');
  }

  async function handleAutoAssign() {
    if (!semesterId) return;
    try {
      const res = await autoMut.mutateAsync({ semesterId, excludeStudentIds: Array.from(excludedStudentIds) });
      const result = res.data?.data as { totalStudents?: number; assignedCount?: number; unassignedCount?: number; warnings?: string[] };
      if (!result?.totalStudents) {
        toast.warning('Không có sinh viên chờ xếp phòng trong kỳ đang chọn.');
      } else if (result.assignedCount === 0) {
        toast.warning(`Không xếp được sinh viên nào. Còn ${result.unassignedCount || result.totalStudents} sinh viên chưa có phòng.`);
      } else {
        toast.success(`Đã xếp phòng tự động: ${result.assignedCount} sinh viên.`);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Xếp phòng thất bại');
    }
    setConfirmAutoAssign(false);
  }
  async function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedStudent || !selectedRoom || !selectedBed) {
      toast.error('Vui lòng chọn đầy đủ sinh viên, phòng và giường');
      return;
    }
    try {
      await manualMut.mutateAsync({
        studentId: selectedStudent,
        roomId: selectedRoom,
        bedId: selectedBed,
        semesterId,
      });
      setManualOpen(false);
      resetManualForm();
      toast.success('Xếp phòng thủ công thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Xếp phòng thất bại');
    }
  }

  async function handleTransferSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!transferAssignment || !selectedRoom || !selectedBed) {
      toast.error('Vui lòng chọn đầy đủ phòng và giường mới');
      return;
    }
    try {
      await transferMut.mutateAsync({
        id: transferAssignment._id,
        data: { newRoomId: selectedRoom, newBedId: selectedBed }
      });
      setTransferAssignment(null);
      resetManualForm();
      toast.success('Chuyển phòng thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Chuyển phòng thất bại');
    }
  }

  const handleUnassign = () => {
    if (!confirmUnassign) return;
    unassignMut.mutate(confirmUnassign, {
      onSuccess: () => {
        toast.success('Hủy xếp phòng thành công');
        setConfirmUnassign(null);
      },
      onError: (err: any) => toast.error(err.response?.data?.message || 'Có lỗi xảy ra'),
    });
  };

  const handleRemoveAllUnassigned = () => {
    removeAllMut.mutate({ 
      semesterId, 
      excludeStudentIds: Array.from(excludedStudentIds)
    }, {
      onSuccess: (res: any) => {
        toast.success(res?.message || 'Đã xóa sinh viên khỏi danh sách chờ xếp phòng');
        setConfirmRemoveAll(false);
      },
      onError: (err: any) => toast.error(err.response?.data?.message || 'Có lỗi xảy ra'),
    });
  };

  const handleAddWaitlistSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWaitlistStudent) {
      toast.error('Vui lòng chọn sinh viên');
      return;
    }
    waitlistMut.mutate(
      { id: selectedWaitlistStudent, semesterId },
      {
        onSuccess: () => {
          toast.success('Đã thêm sinh viên vào danh sách chờ');
          setAddWaitlistOpen(false);
          setSelectedWaitlistStudent('');
          setStudentKeyword('');
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Có lỗi xảy ra'),
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="mb-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex gap-4 border-b border-border w-full lg:w-auto min-w-[250px]">
            {semesterId ? (
              <>
                <button
                  className={`pb-2 text-sm font-semibold transition-colors -mb-[1px] ${activeTab === 'assigned' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  onClick={() => setActiveTab('assigned')}
                >
                  Đã xếp phòng ({filteredAssignments.length})
                </button>
                <button
                  className={`pb-2 text-sm font-semibold transition-colors -mb-[1px] ${activeTab === 'unassigned' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                  onClick={() => setActiveTab('unassigned')}
                >
                  Chưa xếp phòng ({filteredUnassignedStudents.length})
                </button>
              </>
            ) : (
              <span className="pb-2 text-sm text-text-secondary">Vui lòng chọn kỳ lưu trú</span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3 lg:justify-end">
            <div className="w-full sm:w-72">
              <Select
                label=""
                options={(semesters?.items || []).map(s => ({ value: s._id, label: `${s.name} (${getStatusLabel(s.status)})` }))}
                placeholder="Chọn kỳ lưu trú..."
                value={semesterId}
                onChange={e => setSemesterId(e.target.value)}
              />
            </div>
            
            {semesterId && (
              <>
                <div className="w-full sm:w-64">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      className="w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 pl-9 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Tìm kiếm mã SV, họ tên..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-full sm:w-40">
                  <Select
                    label=""
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Tất cả giới tính' },
                      { value: 'MALE', label: 'Nam' },
                      { value: 'FEMALE', label: 'Nữ' },
                    ]}
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Select
                    label=""
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    options={[
                      { value: 'ALL', label: 'Tất cả phòng' },
                      { value: 'FRESHMAN', label: 'Ưu tiên Tân SV' },
                      { value: 'NORMAL', label: 'Không ưu tiên' },
                    ]}
                  />
                </div>
                
                {canAssign && (
                  <Button onClick={() => setConfirmAutoAssign(true)} loading={autoMut.isPending} className="whitespace-nowrap">
                    <Shuffle size={16} /> Xếp tự động
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {isLoading && semesterId && activeTab === 'assigned' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-3 h-5 w-24" />
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-10 w-full" />)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && assignments && activeTab === 'assigned' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {paginatedGroupedEntries.map(([roomKey, members]) => (
              <Card key={roomKey}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <BedDouble size={16} /> {roomKey}
                  {members[0] && (members[0].roomId as any)?.isFreshmanPriority && (
                    <span title="Phòng ưu tiên Tân sinh viên">
                      <Star className="text-yellow-500" size={16} fill="currentColor" />
                    </span>
                  )}
                </h3>
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Users size={14} /> {members.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {members.map(m => {
                  const student = typeof m.studentId === 'object' ? m.studentId : null;
                  const bed = typeof m.bedId === 'object' ? m.bedId : null;
                  return (
                    <div key={m._id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-bg-page px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{student?.studentCode}</span>
                        <span className="ml-2 text-text-secondary">{student?.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">{bed?.bedNumber}</span>
                        <Badge value={student?.gender || ''} />
                        {canAssign && (
                          <div className="flex gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => { setTransferAssignment(m as any); setSelectedBuilding(''); setSelectedFloor(''); setSelectedRoom(''); setSelectedBed(''); }}
                              className="rounded p-1 text-text-secondary hover:bg-primary/10 hover:text-primary"
                              title="Chuyển phòng"
                            >
                              <ArrowRightLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmUnassign(m._id)}
                              className="rounded p-1 text-text-secondary hover:bg-status-error-text/10 hover:text-status-error-text"
                              title="Hủy xếp phòng"
                            >
                              <UserMinus size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            ))}
          </div>
          {totalAssignedPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination currentPage={assignedPage} totalPages={totalAssignedPages} onPageChange={setAssignedPage} />
            </div>
          )}
        </>
      )}

      {activeTab === 'unassigned' && semesterId && (
        <Card>
          {isLoadingUnassigned ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredUnassignedStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="mb-3 px-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <p className="text-xs text-text-secondary italic">
                  * Ghi chú: Đánh dấu <span className="font-semibold text-primary">"Loại trừ"</span> đối với những sinh viên bạn muốn tự xếp phòng thủ công. Các sinh viên này sẽ không bị ảnh hưởng khi thực hiện "Xếp tự động".
                </p>
                {canAssign && (
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddWaitlistOpen(true)}
                      className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      <Plus size={14} /> Thêm thủ công
                    </Button>
                    {filteredUnassignedStudents.length > 0 && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmRemoveAll(true)}
                        className="flex items-center gap-2"
                      >
                        <UserMinus size={14} /> Xóa danh sách chờ
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-2 pr-3 font-medium w-24 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-text-secondary" title="Loại trừ khỏi xếp tự động">Loại trừ</span>
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                          title="Loại trừ tất cả khỏi xếp tự động"
                          checked={filteredUnassignedStudents.length > 0 && excludedStudentIds.size === filteredUnassignedStudents.length}
                          disabled={!canAssign}
                          onChange={(e) => {
                            if (e.target.checked) setExcludedStudentIds(new Set(filteredUnassignedStudents.map((s: any) => s._id)));
                            else setExcludedStudentIds(new Set());
                          }}
                        />
                      </div>
                    </th>
                    <th className="py-2 pr-3 font-medium">MSSV</th>
                    <th className="py-2 pr-3 font-medium">Họ tên</th>
                    <th className="py-2 pr-3 font-medium">Giới tính</th>
                    <th className="py-2 pr-3 font-medium">Lớp</th>
                    <th className="py-2 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnassignedStudents.map((student: any) => (
                    <tr key={student._id} className="border-b border-border last:border-0 hover:bg-bg-page/50 transition-colors">
                      <td className="py-2 pr-3 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                          title="Loại trừ sinh viên này khỏi xếp phòng tự động"
                          checked={excludedStudentIds.has(student._id)}
                          disabled={!canAssign}
                          onChange={(e) => {
                            const newSet = new Set(excludedStudentIds);
                            if (e.target.checked) newSet.add(student._id);
                            else newSet.delete(student._id);
                            setExcludedStudentIds(newSet);
                          }}
                        />
                      </td>
                      <td className="py-2 pr-3 font-medium">{student.studentCode}</td>
                      <td className="py-2 pr-3">{student.fullName}</td>
                      <td className="py-2 pr-3"><Badge value={student.gender} /></td>
                      <td className="py-2 pr-3">{student.className || '—'}</td>
                      <td className="py-2">
                        {canAssign ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              resetManualForm();
                              setSelectedStudent(student._id);
                              setManualOpen(true);
                            }}
                          >
                            Xếp phòng
                          </Button>
                        ) : (
                          <span className="text-xs text-text-secondary">Chưa mở / Đã kết thúc</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              Không có sinh viên nào chưa xếp phòng.
            </div>
          )}
          {filteredUnassignedStudents.length > 0 && totalUnassignedPages > 1 && (
            <div className="mt-4 flex justify-center border-t border-border pt-4">
              <Pagination currentPage={unassignedPage} totalPages={totalUnassignedPages} onPageChange={setUnassignedPage} />
            </div>
          )}
        </Card>
      )}

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Xếp phòng thủ công">
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
          <div className="text-sm font-medium">
            Sinh viên: {unassignedStudents?.find((s: any) => s._id === selectedStudent)?.fullName} - {unassignedStudents?.find((s: any) => s._id === selectedStudent)?.studentCode}
          </div>
          <SearchableSelect
            label="Tòa nhà"
            options={buildingOptions}
            value={selectedBuilding}
            onChange={v => { setSelectedBuilding(v); setSelectedFloor(''); setSelectedRoom(''); setSelectedBed(''); }}
            placeholder="Chọn tòa nhà..."
          />
          {selectedBuilding && (
            <SearchableSelect
              label="Tầng"
              options={floorOptions}
              value={selectedFloor}
              onChange={v => { setSelectedFloor(v); setSelectedRoom(''); setSelectedBed(''); }}
              placeholder="Chọn tầng..."
            />
          )}
          {selectedFloor && (
            <SearchableSelect
              label="Phòng"
              options={roomOptions}
              value={selectedRoom}
              onChange={v => { setSelectedRoom(v); setSelectedBed(''); }}
              placeholder="Chọn phòng..."
            />
          )}
          {selectedRoom && (
            <SearchableSelect
              label="Giường"
              options={bedOptions}
              value={selectedBed}
              onChange={setSelectedBed}
              placeholder="Chọn giường..."
            />
          )}
          <Button type="submit" loading={manualMut.isPending} className="mt-2">Xếp phòng</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmAutoAssign}
        onClose={() => setConfirmAutoAssign(false)}
        title="Xếp phòng tự động"
        message={`Hệ thống sẽ tự động xếp phòng cho các sinh viên chưa có phòng trong kỳ này.${excludedStudentIds.size > 0 ? ` (Đã loại trừ ${excludedStudentIds.size} sinh viên được chọn)` : ''} Bạn có chắc chắn muốn thực hiện?`}
        onConfirm={handleAutoAssign}
        confirmText="Xếp phòng"
        loading={autoMut.isPending}
      />

      <Modal open={!!transferAssignment} onClose={() => setTransferAssignment(null)} title="Chuyển phòng">
        <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
          <div className="text-sm font-medium">Sinh viên: {(transferAssignment?.studentId as any)?.fullName} - {(transferAssignment?.studentId as any)?.studentCode}</div>
          <SearchableSelect
            label="Tòa nhà mới"
            options={buildingOptions}
            value={selectedBuilding}
            onChange={v => { setSelectedBuilding(v); setSelectedFloor(''); setSelectedRoom(''); setSelectedBed(''); }}
            placeholder="Chọn tòa nhà..."
          />
          {selectedBuilding && (
            <SearchableSelect
              label="Tầng mới"
              options={floorOptions}
              value={selectedFloor}
              onChange={v => { setSelectedFloor(v); setSelectedRoom(''); setSelectedBed(''); }}
              placeholder="Chọn tầng..."
            />
          )}
          {selectedFloor && (
            <SearchableSelect
              label="Phòng mới"
              options={roomOptions}
              value={selectedRoom}
              onChange={v => { setSelectedRoom(v); setSelectedBed(''); }}
              placeholder="Chọn phòng..."
            />
          )}
          {selectedRoom && (
            <SearchableSelect
              label="Giường mới"
              options={bedOptions}
              value={selectedBed}
              onChange={setSelectedBed}
              placeholder="Chọn giường..."
            />
          )}
          <Button type="submit" loading={transferMut.isPending} className="mt-2">Lưu thay đổi</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmUnassign}
        onClose={() => setConfirmUnassign(null)}
        title="Xác nhận hủy xếp phòng"
        message="Bạn có chắc chắn muốn đưa sinh viên này ra khỏi phòng hiện tại? Sinh viên sẽ được chuyển về danh sách chưa xếp phòng."
        onConfirm={handleUnassign}
        confirmText="Hủy xếp phòng"
        loading={unassignMut.isPending}
      />

      <ConfirmDialog
        open={confirmRemoveAll}
        onClose={() => setConfirmRemoveAll(false)}
        title="Xóa danh sách chờ xếp phòng"
        message={`Bạn có chắc chắn muốn xóa tất cả sinh viên đang chờ xếp phòng? 
        \nLưu ý: Các sinh viên đã được đánh dấu "Loại trừ" sẽ KHÔNG bị xóa.`}
        onConfirm={handleRemoveAllUnassigned}
        confirmText="Xóa sinh viên"
        variant="danger"
        loading={removeAllMut.isPending}
      />

      <Modal open={addWaitlistOpen} onClose={() => setAddWaitlistOpen(false)} title="Thêm sinh viên vào danh sách chờ">
        <form onSubmit={handleAddWaitlistSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Tìm kiếm sinh viên theo mã số hoặc họ tên để thêm vào danh sách chờ xếp phòng cho kỳ lưu trú đang chọn.
          </p>
          <SearchableSelect
            label="Tìm sinh viên"
            options={studentOptions}
            value={selectedWaitlistStudent}
            onChange={setSelectedWaitlistStudent}
            onSearch={setStudentKeyword}
            placeholder="Nhập mã hoặc tên SV..."
            loading={studentsLoading}
          />
          <Button type="submit" loading={waitlistMut.isPending} className="mt-2" disabled={!selectedWaitlistStudent}>
            Thêm vào hàng chờ
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function groupByRoom(assignments: RoomAssignment[]): Record<string, RoomAssignment[]> {
  const groups: Record<string, RoomAssignment[]> = {};
  for (const a of assignments) {
    const room = typeof a.roomId === 'object' ? a.roomId : null;
    const snap = a.roomSnapshot as { buildingName?: string; roomNumber?: string } | undefined;
    const key = room ? `${snap?.buildingName || '?'}-${room.roomNumber}` : 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return groups;
}
