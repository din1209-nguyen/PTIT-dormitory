'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useStudents, useStudentStats, useCreateStudent, useUpdateStudent, useAddToWaitingList } from '@/features/students/api';
import { useFaculties } from '@/features/dormitories/api';
import { StudentDetailModal } from '@/features/students/components/StudentDetailModal';
import apiClient from '@/lib/api/apiClient';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableSkeleton } from '@/components/common/Skeleton';
import type { Student } from '@/types/student';
import type { ApiResponse } from '@/types/api';

const MAJORS = [
  { code: 'CN', name: 'Công nghệ thông tin', dept: 'Công nghệ thông tin' },
  { code: 'AT', name: 'An toàn thông tin', dept: 'Công nghệ thông tin' },
  { code: 'VT', name: 'Kỹ thuật điện tử viễn thông', dept: 'Viễn thông' },
  { code: 'DT', name: 'Kỹ thuật điện tử', dept: 'Kỹ thuật Điện tử' },
  { code: 'PT', name: 'Công nghệ đa phương tiện', dept: 'Đa phương tiện' },
  { code: 'KT', name: 'Kế toán', dept: 'Kế toán' },
  { code: 'QT', name: 'Quản trị kinh doanh', dept: 'Quản trị kinh doanh' },
  { code: 'MR', name: 'Marketing', dept: 'Quản trị kinh doanh' }
];

function useFreshmanCohortYears() {
  return useQuery({
    queryKey: ['config', 'freshman_cohort_years'],
    queryFn: () => apiClient.get<ApiResponse<{ configValue: string }>>('/configs/freshman_cohort_years').then(r => {
      try { return JSON.parse(r.data.data.configValue) as string[]; } catch { return []; }
    }),
  });
}

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [residenceFilter, setResidenceFilter] = useState('');
  const [freshmanOnly, setFreshmanOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [selectedDept, setSelectedDept] = useState('');
  const [confirmWaitingStudent, setConfirmWaitingStudent] = useState<Student | null>(null);

  const { data, isLoading } = useStudents({
    page, limit: 10, keyword, gender: genderFilter, department: deptFilter,
    residenceType: residenceFilter,
    isFreshman: freshmanOnly ? true : undefined
  });
  const { data: studentStats } = useStudentStats();
  const { data: faculties } = useFaculties();
  const { data: freshmanYears } = useFreshmanCohortYears();
  const createMut = useCreateStudent();
  const updateMut = useUpdateStudent();
  const waitingListMut = useAddToWaitingList();

  const freshmanSet = useMemo(() => new Set(freshmanYears || []), [freshmanYears]);

  function openCreate() {
    setEditing(null);
    setUnlockedFields({});
    setSelectedDept('');
    setModalOpen(true);
  }

  const isDisabled = (fieldName: string) => !!editing && !unlockedFields[fieldName];
  const handleEdit = (fieldName: string) => () => setUnlockedFields(prev => {
    const next = { ...prev, [fieldName]: true };
    if (fieldName === 'department') next.major = true;
    if (fieldName === 'major') next.department = true;
    return next;
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    // Cross validate major code in studentCode and className
    if (data.major && selectedDept) {
      const majorObj = MAJORS.find(m => m.name === data.major && m.dept === selectedDept);
      if (majorObj) {
        if (data.studentCode) {
          const m = String(data.studentCode).match(/^[a-zA-Z]{1,2}\d{2}[a-zA-Z]{2}([a-zA-Z]{2})\d{3,4}$/);
          if (m && m[1] !== majorObj.code) {
            toast.error(`Mã sinh viên không khớp với ngành ${data.major} (Phải chứa mã ${majorObj.code})`);
            return;
          }
        }
        if (data.className) {
          const m = String(data.className).match(/^[a-zA-Z]{1,2}\d{2}[a-zA-Z]{2}([a-zA-Z]{2})\d{2}-[a-zA-Z0-9]{1,2}$/);
          if (m && m[1] !== majorObj.code) {
            toast.error(`Mã lớp không khớp với ngành ${data.major} (Phải chứa mã ${majorObj.code})`);
            return;
          }
        }
      }
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing._id, data: data as Record<string, unknown> });
        toast.success('Cập nhật sinh viên thành công');
      } else {
        await createMut.mutateAsync(data as Partial<Student>);
        toast.success('Thêm sinh viên thành công');
      }
      setModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Thao tác thất bại';
      if (msg.toLowerCase().includes('đã tồn tại')) {
        try {
          const res = await apiClient.get('/students', { params: { keyword: data.studentCode } });
          if (res.data?.data?.items?.length > 0) {
            setConfirmWaitingStudent(res.data.data.items[0]);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      toast.error(msg);
    }
  }

  async function handleCheckStudentCode(e: React.FocusEvent<HTMLInputElement>) {
    if (editing) return;
    const code = e.target.value.trim();
    if (!code) return;
    try {
      const res = await apiClient.get('/students', { params: { keyword: code } });
      if (res.data?.data?.items?.length > 0) {
        const student = res.data.data.items.find((s: any) => s.studentCode === code);
        if (student) {
          setConfirmWaitingStudent(student);
        }
      }
    } catch (err) {
      // ignore
    }
  }

  const facultyOptions = (faculties || []).map((f: string) => ({ value: f, label: f }));

  const residenceOptions = [
    { value: 'NOT_RESIDING', label: 'Không ở' },
    { value: 'PENDING_ROOM', label: 'Chưa có phòng' },
    { value: 'RESIDING', label: 'Đã có phòng' }
  ];

  const genderOptions = [
    { value: 'MALE', label: 'Nam' },
    { value: 'FEMALE', label: 'Nữ' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="flex min-h-16 items-center justify-between gap-3 border border-border p-4 shadow-sm">
          <span className="text-sm font-medium text-text-secondary">Tổng sinh viên</span>
          <span className="shrink-0 text-xl font-semibold text-text-primary">{studentStats?.total || 0}</span>
        </Card>
        <Card className="flex min-h-16 items-center justify-between gap-3 border border-border p-4 shadow-sm">
          <span className="text-sm font-medium text-text-secondary">Chưa có phòng</span>
          <span className="shrink-0 text-xl font-semibold text-text-primary">{studentStats?.pending || 0}</span>
        </Card>
        <Card className="flex min-h-16 items-center justify-between gap-3 border border-border p-4 shadow-sm">
          <span className="text-sm font-medium text-text-secondary">Đang lưu trú</span>
          <span className="shrink-0 text-xl font-semibold text-text-primary">{studentStats?.residing || 0}</span>
        </Card>
        <Card className="flex min-h-16 items-center justify-between gap-3 border border-border p-4 shadow-sm">
          <span className="text-sm font-medium text-text-secondary">Không ở</span>
          <span className="shrink-0 text-xl font-semibold text-text-primary">{studentStats?.inactive || 0}</span>
        </Card>
      </div>
      
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              className="w-full rounded-[var(--radius-pill)] border border-border bg-bg-page py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
              placeholder="Tìm mã SV, tên, email..."
              value={keyword}
              onChange={e => { setKeyword(e.target.value); setPage(1); }}
            />
          </div>
          <Select options={genderOptions} placeholder="Tất cả giới tính" value={genderFilter} onChange={e => { setGenderFilter(e.target.value); setPage(1); }} />
          <Select options={facultyOptions} placeholder="Tất cả khoa" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} />
          <Select options={residenceOptions} placeholder="Tất cả trạng thái" value={residenceFilter} onChange={e => { setResidenceFilter(e.target.value); setPage(1); }} />
          <label className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-bg-page px-4 text-sm font-medium text-text-primary">
            <input
              type="checkbox"
              checked={freshmanOnly}
              onChange={e => { setFreshmanOnly(e.target.checked); setPage(1); }}
              className="h-4 w-4 accent-primary"
            />
            Tân sinh viên
          </label>
          <Button onClick={openCreate} className="ml-auto shrink-0 gap-2">
            <Plus size={16} /> Thêm sinh viên
          </Button>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton columns={7} rows={5} /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-3 pr-4 font-medium">MSSV</th>
                    <th className="py-3 pr-4 font-medium">Họ tên</th>
                    <th className="py-3 pr-4 font-medium">Giới tính</th>
                    <th className="py-3 pr-4 font-medium">Khoa</th>
                    <th className="py-3 pr-4 font-medium">Khóa</th>
                    <th className="py-3 pr-4 font-medium">Cư trú</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(s => (
                    <tr key={s._id} onClick={() => setViewingStudent(s)} className="border-b border-border last:border-0 cursor-pointer hover:bg-bg-page transition-colors">
                      <td className="py-3 pr-4 font-medium">{s.studentCode}</td>
                      <td className="py-3 pr-4">
                        {s.fullName}
                        {freshmanSet.has(s.academicYear || '') && (
                          <span className="ml-2 inline-flex rounded-[var(--radius-pill)] bg-status-pending-bg px-2 py-0.5 text-[10px] font-semibold text-status-pending-text">Tân SV</span>
                        )}
                      </td>
                      <td className="py-3 pr-4"><Badge value={s.gender} /></td>
                      <td className="py-3 pr-4">{s.department || '—'}</td>
                      <td className="py-3 pr-4">{s.academicYear || '—'}</td>
                      <td className="py-3 pr-4"><Badge value={s.residenceType} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.pagination.totalPages > 1 && (
              <Pagination currentPage={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Hồ sơ sinh viên' : 'Thêm sinh viên'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          {editing && (
            <div className="mb-4 flex flex-col items-center justify-center gap-2 border-b border-border pb-6 pt-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-text-primary">{editing.fullName}</h3>
                <p className="text-sm text-text-secondary">{editing.studentCode}</p>
              </div>
            </div>
          )}

          {!editing || unlockedFields['studentCode'] ? (
            <div className="mb-3"><Input label="Mã sinh viên" name="studentCode" defaultValue={editing?.studentCode} placeholder="VD: N24DCCN010" required disabled={isDisabled('studentCode')} onEdit={handleEdit('studentCode')} onBlur={handleCheckStudentCode} /></div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Mã sinh viên</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.studentCode}</span>
                <button type="button" onClick={handleEdit('studentCode')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing || unlockedFields['fullName'] ? (
            <div className="mb-3"><Input label="Họ tên" name="fullName" defaultValue={editing?.fullName} required disabled={isDisabled('fullName')} onEdit={handleEdit('fullName')} /></div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Họ tên</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.fullName}</span>
                <button type="button" onClick={handleEdit('fullName')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing || unlockedFields['gender'] ? (
            <div className="mb-3"><Select label="Giới tính" name="gender" options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} defaultValue={editing?.gender} disabled={isDisabled('gender')} onEdit={handleEdit('gender')} /></div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Giới tính</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.gender === 'MALE' ? 'Nam' : editing.gender === 'FEMALE' ? 'Nữ' : '—'}</span>
                <button type="button" onClick={handleEdit('gender')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing || unlockedFields['email'] ? (
            <div className="mb-3"><Input label="Email" name="email" type="email" defaultValue={editing?.email} required disabled={isDisabled('email')} onEdit={handleEdit('email')} /></div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Email</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.email || '—'}</span>
                <button type="button" onClick={handleEdit('email')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing || unlockedFields['department'] ? (
            <div className="mb-3"><Select label="Khoa" name="department" options={facultyOptions} placeholder="Chọn khoa" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} disabled={isDisabled('department')} onEdit={handleEdit('department')} /></div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Khoa</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.department || '—'}</span>
                <button type="button" onClick={handleEdit('department')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing || unlockedFields['major'] ? (
            <div className="mb-3">
              <Select
                label="Ngành"
                name="major"
                options={MAJORS.filter(m => m.dept === selectedDept).map(m => ({ value: m.name, label: m.name }))}
                placeholder="Chọn ngành"
                defaultValue={editing?.major}
                disabled={isDisabled('major') || !selectedDept}
                onEdit={handleEdit('major')}
              />
            </div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Ngành</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.major || '—'}</span>
                <button type="button" onClick={handleEdit('major')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing || unlockedFields['className'] ? (
            <div className="mb-3"><Input label="Lớp" name="className" defaultValue={editing?.className} placeholder="VD: D24CQCN01-N" disabled={isDisabled('className')} onEdit={handleEdit('className')} /></div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Lớp</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.className || '—'}</span>
                <button type="button" onClick={handleEdit('className')} className="text-text-secondary opacity-0 transition-all hover:text-primary group-hover:opacity-100"><Edit2 size={14} /></button>
              </div>
            </div>
          )}

          {!editing ? (
            <div className="mb-3">
              <label className="text-sm font-medium text-text-primary">Khóa</label>
              <div className="mt-1.5 w-full rounded-[var(--radius-sm)] border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-secondary">
                Sẽ tự động tạo từ Mã sinh viên
              </div>
            </div>
          ) : (
            <div className="group flex items-center justify-between rounded-[var(--radius-sm)] border border-transparent px-3 py-2 transition-colors hover:bg-bg-page">
              <span className="text-sm text-text-secondary">Khóa</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary">{editing.academicYear || '—'}</span>
              </div>
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={createMut.isPending || updateMut.isPending} className="flex-1" disabled={!!editing && Object.keys(unlockedFields).length === 0}>
              {editing ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmWaitingStudent}
        onClose={() => setConfirmWaitingStudent(null)}
        onConfirm={() => {
          if (confirmWaitingStudent) {
            waitingListMut.mutate(confirmWaitingStudent._id, {
              onSuccess: () => toast.success(`Đã thêm ${confirmWaitingStudent.fullName} vào danh sách chờ`),
              onError: (e: any) => toast.error(e.response?.data?.message || 'Không thể thêm vào danh sách chờ')
            });
            setConfirmWaitingStudent(null);
            setModalOpen(false);
          }
        }}
        title="Sinh viên đã tồn tại"
        message={confirmWaitingStudent ? `Mã sinh viên ${confirmWaitingStudent.studentCode} đã tồn tại. Bạn có muốn đưa sinh viên này vào danh sách chờ xếp phòng không?` : ''}
        confirmText="Đưa vào hàng chờ"
      />

      {viewingStudent && (
        <StudentDetailModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </div>
  );
}
