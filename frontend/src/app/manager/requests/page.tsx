'use client';

import { useState } from 'react';
import { useAllRequests, useUpdateRequestStatus } from '@/features/requests/api';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import { StudentDetailModal } from '@/features/students/components/StudentDetailModal';
import type { StudentSummary } from '@/types/notification';
import type { StudentRequestType } from '@/types/request';

export default function RequestsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<StudentRequestType | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentSummary | null>(null);
  const { data, isLoading } = useAllRequests({ page, limit: 10, status: statusFilter });
  const updateMut = useUpdateRequestStatus();

  async function handleUpdateStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    await updateMut.mutateAsync({
      id: selected._id,
      data: {
        status: fd.get('status') as string,
        managerNote: fd.get('managerNote') as string,
      },
    });
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col flex-wrap items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <Select
              options={[
                { value: 'PENDING', label: 'Chờ xử lý' },
                { value: 'PROCESSING', label: 'Đang xử lý' },
                { value: 'RESOLVED', label: 'Đã xử lý' },
                { value: 'REJECTED', label: 'Từ chối' },
              ]}
              placeholder="Tất cả trạng thái"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton columns={5} rows={5} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-3 pr-4 font-medium">Mã sinh viên</th>
                <th className="py-3 pr-4 font-medium">Họ và tên</th>
                <th className="py-3 pr-4 font-medium">Tiêu đề</th>
                <th className="py-3 pr-4 font-medium">Loại</th>
                <th className="py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map(r => {
                const student = typeof r.studentId === 'object' ? r.studentId : null;
                return (
                  <tr
                    key={r._id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-bg-page/50"
                  >
                    <td className="py-3 pr-4 font-semibold text-text-primary">{student?.studentCode}</td>
                    <td className="py-3 pr-4">{student?.fullName}</td>
                    <td className="py-3 pr-4">{r.title}</td>
                    <td className="py-3 pr-4"><Badge value={r.type} /></td>
                    <td className="py-3"><Badge value={r.status} /></td>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Chi tiết đơn từ" size="xl">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
              {typeof selected.studentId === 'object' && (
                <div className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4 text-sm">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Sinh viên</div>
                  <button
                    type="button"
                    onClick={() => setViewingStudent(selected.studentId as StudentSummary)}
                    className="mb-1 block max-w-full truncate text-left font-semibold text-primary hover:underline"
                    title={selected.studentId.fullName}
                  >
                    {selected.studentId.fullName}
                  </button>
                  <div className="text-text-secondary">{selected.studentId.studentCode}</div>
                  <div className="mt-3 grid gap-2 text-xs text-text-secondary">
                    <div>Lớp: <span className="font-medium text-text-primary">{selected.studentId.className || '—'}</span></div>
                    <div>Khoa: <span className="font-medium text-text-primary">{selected.studentId.department || '—'}</span></div>
                  </div>
                </div>
              )}

              <div className="rounded-[var(--radius-md)] border border-border bg-bg-card p-4 text-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge value={selected.type} />
                  <Badge value={selected.status} />
                </div>
                <h4 className="font-semibold text-text-primary">{selected.title}</h4>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-text-secondary">{selected.content}</p>
                <div className="mt-4 text-xs text-text-secondary">
                  Ngày gửi: {new Date(selected.createdAt).toLocaleDateString('vi-VN')}
                </div>
                {selected.managerNote && (
                  <div className="mt-3 rounded-[var(--radius-sm)] bg-bg-page p-3 text-text-secondary">
                    <strong className="text-text-primary">Ghi chú:</strong> {selected.managerNote}
                  </div>
                )}
              </div>
            </div>

            {(selected.status === 'PENDING' || selected.status === 'PROCESSING') && (
              <form onSubmit={handleUpdateStatus} className="flex flex-col gap-3 border-t border-border pt-4">
                <Select
                  label="Trạng thái mới"
                  name="status"
                  options={[
                    { value: 'PROCESSING', label: 'Đang xử lý' },
                    { value: 'RESOLVED', label: 'Đã xử lý' },
                    { value: 'REJECTED', label: 'Từ chối' },
                  ]}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Ghi chú</label>
                  <textarea
                    name="managerNote"
                    rows={3}
                    className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <Button type="submit" loading={updateMut.isPending} className="mt-2">Cập nhật</Button>
              </form>
            )}
          </div>
        )}
      </Modal>

      {viewingStudent && (
        <StudentDetailModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}
    </div>
  );
}
