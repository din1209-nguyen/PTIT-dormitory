'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useViolations, useCreateViolation, useUpdateViolation } from '@/features/violations/api';
import { useStudents } from '@/features/students/api';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Select } from '@/components/common/Select';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { StudentDetailModal } from '@/features/students/components/StudentDetailModal';
import type { StudentSummary } from '@/types/notification';
import type { Violation } from '@/types/violation';

const PENALTY_OPTIONS = [
  { value: '', label: '-- Chưa có hình phạt (Chờ xử lý) --' },
  { value: 'Nhắc nhở', label: 'Nhắc nhở' },
  { value: 'Cảnh cáo', label: 'Cảnh cáo' },
  { value: 'Phạt tiền / Bồi thường', label: 'Phạt tiền / Bồi thường' },
  { value: 'Lao động công ích', label: 'Lao động công ích' },
  { value: 'Đình chỉ nội trú', label: 'Đình chỉ nội trú' },
  { value: 'OTHER', label: 'Khác...' },
];

export default function ViolationsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentKeyword, setStudentKeyword] = useState('');
  const [penaltyTemplate, setPenaltyTemplate] = useState('');
  const [customPenalty, setCustomPenalty] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentSummary | null>(null);
  const { data, isLoading } = useViolations({ page, limit: 10 });
  const createMut = useCreateViolation();
  const updateMut = useUpdateViolation();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ limit: 50, keyword: studentKeyword || undefined });

  const studentOptions = useMemo(
    () => (studentsData?.items || []).map(s => ({ value: s._id, label: s.studentCode, sublabel: s.fullName })),
    [studentsData],
  );

  function resetForm() {
    setEditId('');
    setSelectedStudent('');
    setPenaltyTemplate('');
    setCustomPenalty('');
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEditViolation(violation: Violation) {
    setEditId(violation._id);
    if (!violation.penalty) {
      setPenaltyTemplate('');
      setCustomPenalty('');
    } else {
      const hasTemplate = PENALTY_OPTIONS.find(o => o.value === violation.penalty && o.value !== 'OTHER' && o.value !== '');
      if (hasTemplate) {
        setPenaltyTemplate(violation.penalty);
        setCustomPenalty('');
      } else {
        setPenaltyTemplate('OTHER');
        setCustomPenalty(violation.penalty || '');
      }
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      if (v && k !== 'customPenalty' && k !== 'penaltyTemplate') body[k] = v;
    });

    body.penalty = penaltyTemplate === 'OTHER' ? customPenalty : penaltyTemplate;

    if (!editId) {
      if (!selectedStudent) {
        toast.error('Vui lòng chọn sinh viên');
        return;
      }
      body.studentId = selectedStudent;
    }

    try {
      if (editId) await updateMut.mutateAsync({ id: editId, data: body });
      else await createMut.mutateAsync(body);
      setModalOpen(false);
      resetForm();
      toast.success(editId ? 'Cập nhật vi phạm thành công' : 'Tạo vi phạm thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Thao tác thất bại');
    }
  }

  async function handleCancel() {
    if (!confirm('Bạn có chắc chắn muốn hủy biên bản này?')) return;
    try {
      await updateMut.mutateAsync({ id: editId, data: { status: 'CANCELLED' } });
      setModalOpen(false);
      resetForm();
      toast.success('Đã hủy biên bản vi phạm');
    } catch (err) {
      toast.error((err as Error).message || 'Hủy thất bại');
    }
  }

  const editingViolation = editId ? data?.items.find(v => v._id === editId) : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col flex-wrap items-center gap-4 sm:flex-row">
          <Button onClick={openCreate} className="shrink-0 gap-2"><Plus size={16} /> Tạo vi phạm</Button>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton columns={5} rows={5} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-3 pr-4 font-medium">MSSV</th>
                <th className="py-3 pr-4 font-medium">Họ tên</th>
                <th className="py-3 pr-4 font-medium">Mô tả</th>
                <th className="py-3 pr-4 font-medium">Ngày</th>
                <th className="py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(v => {
                const student = typeof v.studentId === 'object' ? v.studentId : null;
                return (
                  <tr
                    key={v._id}
                    onClick={() => setSelectedViolation(v)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-bg-page/50"
                  >
                    <td className="py-3 pr-4 font-medium">{student?.studentCode}</td>
                    <td className="py-3 pr-4">{student?.fullName}</td>
                    <td className="max-w-xs truncate py-3 pr-4">{v.description}</td>
                    <td className="py-3 pr-4">{new Date(v.violationDate).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3"><Badge value={v.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {data && data.pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      <Modal
        open={!!selectedViolation}
        onClose={() => setSelectedViolation(null)}
        title="Chi tiết vi phạm"
        size="xl"
      >
        {selectedViolation && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              {typeof selectedViolation.studentId === 'object' && (
                <div className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4 text-sm">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Sinh viên</div>
                  <button
                    type="button"
                    onClick={() => setViewingStudent(selectedViolation.studentId as StudentSummary)}
                    className="mb-1 block max-w-full truncate text-left font-semibold text-primary hover:underline"
                    title={selectedViolation.studentId.fullName}
                  >
                    {selectedViolation.studentId.fullName}
                  </button>
                  <div className="text-text-secondary">{selectedViolation.studentId.studentCode}</div>
                  <div className="mt-3 grid gap-2 text-xs text-text-secondary">
                    <div>Lớp: <span className="font-medium text-text-primary">{selectedViolation.studentId.className || '—'}</span></div>
                    <div>Khoa: <span className="font-medium text-text-primary">{selectedViolation.studentId.department || '—'}</span></div>
                  </div>
                </div>
              )}

              <div className="rounded-[var(--radius-md)] border border-border bg-bg-card p-4 text-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge value={selectedViolation.status} />
                  {selectedViolation.semesterId && typeof selectedViolation.semesterId === 'object' && (
                    <span className="rounded-[var(--radius-pill)] bg-bg-page px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {selectedViolation.semesterId.name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  Ngày vi phạm: {new Date(selectedViolation.violationDate).toLocaleDateString('vi-VN')}
                </div>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-text-primary">{selectedViolation.description}</p>
                <div className="mt-4 rounded-[var(--radius-sm)] bg-bg-page p-3 text-text-secondary">
                  <span className="font-medium text-text-primary">Hình phạt:</span> {selectedViolation.penalty || 'Chưa có hình phạt'}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="secondary" onClick={() => setSelectedViolation(null)}>Đóng</Button>
              <Button
                onClick={() => {
                  openEditViolation(selectedViolation);
                  setSelectedViolation(null);
                }}
              >
                Chỉnh sửa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title={editId ? 'Sửa vi phạm' : 'Tạo vi phạm'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!editId && (
            <SearchableSelect
              label="Sinh viên"
              options={studentOptions}
              value={selectedStudent}
              onChange={setSelectedStudent}
              placeholder="Tìm mã SV hoặc tên..."
              loading={studentsLoading}
              onSearch={setStudentKeyword}
            />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Mô tả vi phạm</label>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={editingViolation?.description || ''}
              className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Select
              label="Hình phạt"
              name="penaltyTemplate"
              options={PENALTY_OPTIONS}
              value={penaltyTemplate}
              onChange={e => setPenaltyTemplate(e.target.value)}
            />
            {penaltyTemplate === 'OTHER' && (
              <Input
                placeholder="Nhập hình phạt khác..."
                name="customPenalty"
                value={customPenalty}
                onChange={e => setCustomPenalty(e.target.value)}
                required
              />
            )}
          </div>

          <Input
            label="Ngày vi phạm"
            name="violationDate"
            type="date"
            required
            defaultValue={editingViolation ? new Date(editingViolation.violationDate).toISOString().split('T')[0] : ''}
          />

          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={createMut.isPending || updateMut.isPending} className="flex-1">
              {editId ? 'Cập nhật' : 'Tạo'}
            </Button>
            {editId && (
              <Button type="button" variant="danger" onClick={handleCancel} loading={updateMut.isPending}>
                Hủy biên bản
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {viewingStudent && (
        <StudentDetailModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}
    </div>
  );
}
