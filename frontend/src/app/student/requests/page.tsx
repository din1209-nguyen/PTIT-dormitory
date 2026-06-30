'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMyRequests, useCreateRequest } from '@/features/requests/api';
import { toast } from 'sonner';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';

const TYPE_OPTIONS = [
  { value: 'REQUEST', label: 'Yêu cầu' },
  { value: 'COMPLAINT', label: 'Khiếu nại' },
  { value: 'FEEDBACK', label: 'Góp ý' },
  { value: 'CASH_PAYMENT', label: 'Thanh toán tiền mặt' },
  { value: 'OTHER', label: 'Khác' },
];

import type { StudentRequestType } from '@/types/request';

export default function StudentRequestsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<StudentRequestType | null>(null);
  const { data, isLoading } = useMyRequests();
  const createMut = useCreateRequest();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMut.mutateAsync({
        type: fd.get('type') as string,
        title: fd.get('title') as string,
        content: fd.get('content') as string,
      });
      setModalOpen(false);
      toast.success('Gửi đơn thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi đơn');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Nộp đơn</Button>
      </div>
      {isLoading ? <div className="p-4"><TableSkeleton columns={5} rows={5} /></div> : (
        <Card>
          {data?.length === 0 ? <p className="text-text-secondary p-4">Chưa có đơn nào.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3 pr-4 font-medium">Tiêu đề</th>
                  <th className="py-3 pr-4 font-medium">Nội dung</th>
                  <th className="py-3 pr-4 font-medium">Loại</th>
                  <th className="py-3 pr-4 font-medium">Ngày gửi</th>
                  <th className="py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data?.map(r => (
                  <tr
                    key={r._id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-bg-page/50"
                  >
                    <td className="py-3 pr-4 font-semibold text-text-primary truncate max-w-[200px]">{r.title}</td>
                    <td className="py-3 pr-4 truncate max-w-[250px]">{r.content}</td>
                    <td className="py-3 pr-4"><Badge value={r.type} /></td>
                    <td className="py-3 pr-4">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3"><Badge value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nộp đơn">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select label="Loại đơn" name="type" options={TYPE_OPTIONS} />
          <Input label="Tiêu đề" name="title" required />
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Nội dung</label><textarea name="content" required rows={4} className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3 py-2 text-sm outline-none focus:border-primary" /></div>
          <Button type="submit" disabled={createMut.isPending} className="mt-2">Gửi đơn</Button>
        </form>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Chi tiết đơn từ" size="xl">
        {selected && (
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
                <strong className="text-text-primary">Ghi chú từ BQL:</strong> {selected.managerNote}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
