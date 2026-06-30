'use client';

import { useState } from 'react';
import { Play, CalendarDays, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useSemesters, useActivateSemester, useRevertSemester } from '@/features/semesters/api';
import { EditSemesterModal } from '@/features/semesters/components/EditSemesterModal';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { TableSkeleton } from '@/components/common/Skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function SemestersPage() {
  const [confirmAction, setConfirmAction] = useState<{ type: 'activate' | 'revert'; id: string; name: string } | null>(null);
  const [editingSemester, setEditingSemester] = useState<any>(null);
  const { data, isLoading } = useSemesters({ limit: 20 });
  const activateMut = useActivateSemester();
  const revertMut = useRevertSemester();

  async function handleConfirmAction() {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'activate') {
        await activateMut.mutateAsync(confirmAction.id);
        toast.success(`Đã kích hoạt kỳ "${confirmAction.name}"`);
      } else if (confirmAction.type === 'revert') {
        await revertMut.mutateAsync(confirmAction.id);
        toast.success(`Đã hoàn tác kích hoạt kỳ "${confirmAction.name}"`);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Thao tác thất bại');
    }
    setConfirmAction(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary bg-bg-page px-3 py-1.5 rounded-[var(--radius-md)] border border-border">
            <CalendarDays size={16} />
            <span>Kỳ học được hệ thống tự động tạo theo lịch năm học</span>
          </div>
        </div>
        {isLoading ? (
          <div className="p-4"><TableSkeleton columns={6} rows={5} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3 pr-4 font-medium">Tên kỳ</th>
                  <th className="py-3 pr-4 font-medium">Năm học</th>
                  <th className="py-3 pr-4 font-medium">Bắt đầu</th>
                  <th className="py-3 pr-4 font-medium">Kết thúc</th>
                  <th className="py-3 pr-4 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map(s => (
                  <tr key={s._id} onClick={() => setEditingSemester(s)} className="border-b border-border last:border-0 cursor-pointer hover:bg-bg-page/50 transition-colors">
                    <td className="py-3 pr-4 font-medium">{s.name}</td>
                    <td className="py-3 pr-4">{s.academicYear}</td>
                    <td className="py-3 pr-4">{new Date(s.startDate).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 pr-4">{new Date(s.endDate).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 pr-4"><Badge value={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EditSemesterModal
        open={!!editingSemester}
        onClose={() => setEditingSemester(null)}
        semester={editingSemester}
        onActivate={() => {
          setConfirmAction({ type: 'activate', id: editingSemester._id, name: editingSemester.name });
          setEditingSemester(null);
        }}
        onRevert={() => {
          setConfirmAction({ type: 'revert', id: editingSemester._id, name: editingSemester.name });
          setEditingSemester(null);
        }}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'activate' ? 'Kích hoạt kỳ lưu trú' : 'Hoàn tác kích hoạt'}
        message={confirmAction?.type === 'activate'
          ? `Bạn có chắc muốn kích hoạt kỳ "${confirmAction?.name}"?`
          : `Bạn muốn hoàn tác kích hoạt cho kỳ "${confirmAction?.name}"? (Lưu ý: Nếu kỳ chưa bắt đầu, toàn bộ dữ liệu xếp phòng sẽ được tự động hoàn tác)`}
        variant="warning"
        confirmText={confirmAction?.type === 'activate' ? 'Kích hoạt' : 'Hoàn tác'}
        loading={activateMut.isPending || revertMut.isPending}
      />
    </div>
  );
}
