'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAllRooms, useBuildings, useFaculties } from '@/features/dormitories/api';
import { useSemesters } from '@/features/semesters/api';
import { downloadHistoryBySemesterExcel, useHistoryBySemester, useRoomAssignmentsByStudent } from '@/features/roomAssignments/api';
import { useStudent } from '@/features/students/api';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { Skeleton } from '@/components/common/Skeleton';
import { Pagination } from '@/components/common/Pagination';
import type { RoomAssignment } from '@/types/roomAssignment';

const genderOptions = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
];

function getStatusLabel(status: string) {
  switch (status) {
    case 'ACTIVE': return 'Đang ở';
    case 'ENDED': return 'Đã kết thúc';
    case 'CANCELLED': return 'Đã hủy';
    default: return status;
  }
}

function getGenderLabel(gender?: string) {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  return '—';
}

function getResidenceLabel(type?: string) {
  switch (type) {
    case 'NOT_RESIDING': return 'Không ở';
    case 'PENDING_ROOM': return 'Chưa có phòng';
    case 'RESIDING': return 'Đang lưu trú';
    default: return '—';
  }
}

function getStudent(assignment: RoomAssignment) {
  return typeof assignment.studentId === 'string' ? null : assignment.studentId;
}

function getPosition(assignment: RoomAssignment) {
  const room = typeof assignment.roomId === 'string' ? null : assignment.roomId;
  const bed = typeof assignment.bedId === 'string' ? null : assignment.bedId;
  const snapshot = assignment.roomSnapshot || {};
  const buildingName = String(snapshot.buildingName || '');
  const floorNumber = snapshot.floorNumber;
  const roomNumber = String(snapshot.roomNumber || room?.roomNumber || '');
  const bedNumber = String(snapshot.bedNumber || bed?.bedNumber || '');

  return [
    buildingName ? `Khu ${buildingName}` : '',
    floorNumber ? `Tầng ${floorNumber}` : '',
    roomNumber ? `Phòng ${roomNumber}` : '',
    bedNumber ? `Giường ${bedNumber}` : '',
  ].filter(Boolean).join(' - ') || '—';
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ResidenceHistoryPage() {
  const [semesterId, setSemesterId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [freshmanOnly, setFreshmanOnly] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: semesters } = useSemesters({ limit: 50 });
  const { data: faculties } = useFaculties();
  const { data: buildings } = useBuildings();
  const { data: allRooms } = useAllRooms();

  const activatedSemesters = useMemo(
    () => (semesters?.items || []).filter(s => s.status === 'ACTIVE' || s.status === 'FINISHED'),
    [semesters],
  );

  useEffect(() => {
    if (!semesterId && activatedSemesters.length) {
      const active = activatedSemesters.find(s => s.status === 'ACTIVE') || activatedSemesters[0];
      setSemesterId(active._id);
    }
  }, [activatedSemesters, semesterId]);

  const filters = useMemo(() => ({
    keyword,
    gender: genderFilter,
    department: deptFilter,
    isFreshman: freshmanOnly ? true : undefined,
    building: buildingFilter,
    room: roomFilter,
  }), [keyword, genderFilter, deptFilter, freshmanOnly, buildingFilter, roomFilter]);

  useEffect(() => {
    setPage(1);
  }, [semesterId, filters]);

  const { data: history, isLoading } = useHistoryBySemester(semesterId, filters);

  const paginatedHistory = useMemo(() => {
    if (!history) return [];
    return history.slice((page - 1) * limit, page * limit);
  }, [history, page]);

  const totalPages = history ? Math.ceil(history.length / limit) : 0;

  const facultyOptions = (faculties || []).map((f: string) => ({ value: f, label: f }));
  const buildingOptions = (buildings || []).map((b: any) => ({ value: b.name, label: `Dãy ${b.name}` }));
  const roomOptions = useMemo(() => {
    const rooms = (allRooms || [])
      .filter((room: any) => !buildingFilter || room.floorId?.buildingId?.name === buildingFilter)
      .map((room: any) => room.roomNumber)
      .filter(Boolean);

    return Array.from(new Set(rooms))
      .sort((a, b) => String(a).localeCompare(String(b), 'vi', { numeric: true }))
      .map(roomNumber => ({ value: String(roomNumber), label: `Phòng ${roomNumber}` }));
  }, [allRooms, buildingFilter]);

  async function handleExportExcel() {
    if (!semesterId) return;
    try {
      setExporting(true);
      const blob = await downloadHistoryBySemesterExcel(semesterId, filters);
      saveBlob(blob, `lich-su-luu-tru-${semesterId}.xlsx`);
      toast.success('Đã xuất file Excel');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col gap-6">
      <Card className="p-3">
        <div className="grid items-end gap-3 md:grid-cols-3 xl:grid-cols-[1.15fr_1.15fr_0.9fr_0.75fr_0.8fr_0.8fr_auto]">
          <Select
            label="Kỳ lưu trú"
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            options={activatedSemesters.map(s => ({
              label: s.name,
              value: s._id,
            }))}
          />

          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Tìm kiếm</label>
            <Search className="absolute bottom-2.5 left-3 h-5 w-5 text-text-secondary" />
            <input
              type="text"
              placeholder="MSSV, tên, email, lớp..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-page py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <Select options={facultyOptions} label="Khoa" placeholder="Tất cả khoa" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} />
          <Select options={genderOptions} label="Giới tính" placeholder="Tất cả giới tính" value={genderFilter} onChange={e => setGenderFilter(e.target.value)} />
          <Select
            options={buildingOptions}
            label="Khu"
            placeholder="Tất cả khu"
            value={buildingFilter}
            onChange={e => {
              setBuildingFilter(e.target.value);
              setRoomFilter('');
            }}
          />
          <Select options={roomOptions} label="Phòng" placeholder="Tất cả phòng" value={roomFilter} onChange={e => setRoomFilter(e.target.value)} />

          <div className="flex items-end gap-3">
            <label className="inline-flex h-10 min-w-[138px] items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-bg-page px-4 text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                checked={freshmanOnly}
                onChange={e => setFreshmanOnly(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Tân sinh viên
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              loading={exporting}
              disabled={!semesterId}
              className="min-w-[116px] justify-center"
            >
              <Download size={16} /> Excel
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-bg-secondary p-4">
          <h2 className="text-lg font-bold text-text-primary">
            Danh sách lưu trú ({history?.length || 0})
          </h2>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              Không có dữ liệu lưu trú nào trong kỳ này
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-3 pr-4 font-medium">MSSV</th>
                    <th className="py-3 pr-4 font-medium">Họ tên</th>
                    <th className="py-3 pr-4 font-medium">Giới tính</th>
                    <th className="py-3 pr-4 font-medium">Vị trí</th>
                    <th className="py-3 pr-4 font-medium">Thời gian bắt đầu</th>
                    <th className="py-3 pr-4 font-medium">Thời gian kết thúc</th>
                  </tr>
                </thead>
              <tbody>
                {paginatedHistory.map((assignment: any) => {
                  const student = getStudent(assignment);
                  const record = assignment.residenceRecordId || {};
                  return (
                    <tr
                      key={assignment._id}
                      onClick={() => student?._id && setSelectedStudentId(student._id)}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-bg-page transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">{student?.studentCode || '—'}</td>
                      <td className="py-3 pr-4">
                        {student?.fullName || '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge value={student?.gender || ''} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-text-primary">{getPosition(assignment)}</div>
                        {assignment.status !== 'ENDED' && (
                          <div className="mt-1.5 flex items-center gap-2 text-sm text-text-secondary">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              assignment.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {getStatusLabel(assignment.status)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {record.startDate ? new Date(record.startDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {record.endDate ? new Date(record.endDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t border-border bg-bg-secondary p-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {selectedStudentId && (
        <StudentHistoryModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}

function StudentHistoryModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data: student, isLoading: isStudentLoading } = useStudent(studentId);
  const { data: studentHistory, isLoading: isHistoryLoading } = useRoomAssignmentsByStudent(studentId);

  return (
    <Modal open={true} onClose={onClose} title="Chi tiết sinh viên và lịch sử lưu trú" size="3xl">
      <div className="space-y-6">
        {isStudentLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : student ? (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-secondary/20 p-4 md:flex-row md:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User size={28} />
            </div>
            <div className="grid flex-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-lg font-bold text-text-primary">{student.fullName}</div>
                <div className="text-text-secondary">{student.studentCode}</div>
              </div>
              <div>
                <div className="text-text-secondary">Giới tính</div>
                <div className="font-medium text-text-primary">{getGenderLabel(student.gender)}</div>
              </div>
              <div>
                <div className="text-text-secondary">Khoa / Lớp</div>
                <div className="font-medium text-text-primary">{student.department || '—'} / {student.className || '—'}</div>
              </div>
              <div>
                <div className="text-text-secondary">Cư trú</div>
                <div className="font-medium text-text-primary">{getResidenceLabel(student.residenceType)}</div>
              </div>
              <div>
                <div className="text-text-secondary">Email</div>
                <div className="font-medium text-text-primary">{student.email || '—'}</div>
              </div>
              <div>
                <div className="text-text-secondary">Số điện thoại</div>
                <div className="font-medium text-text-primary">{student.phone || '—'}</div>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="mb-3 text-base font-semibold text-text-primary">Lịch sử lưu trú</h3>
          {isHistoryLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !studentHistory || studentHistory.length === 0 ? (
            <div className="py-8 text-center text-text-secondary">
              Sinh viên này chưa có lịch sử lưu trú.
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-2">
              {studentHistory.map((record) => {
                const sem = typeof record.semesterId === 'string' ? null : record.semesterId;
                return (
                  <div key={record._id} className="rounded-lg border border-border bg-bg-secondary/20 p-4">
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-primary-700">
                          {sem ? sem.name : '—'}
                        </h4>
                        <p className="mt-1 text-sm text-text-secondary">{getPosition(record)}</p>
                      </div>
                      <Badge value={record.status} />
                    </div>
                    <div className="text-xs text-text-tertiary">
                      Ngày xếp: {new Date(record.assignedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
